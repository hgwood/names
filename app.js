(function () { 'use strict';

angular.module('app', ['ngRoute', 'ui.bootstrap', 'ui.sortable', 'angularMoment', 'firebase', 'ng-polymer-elements', 'hgDefer', 'hgUnique'])

.config(function ($routeProvider) {
  $routeProvider
    .when('/login', {
      templateUrl: 'login.html',
      controller: 'loginController',
      isLoginPage: true,
    })
    .when('/names', {
      templateUrl: 'names.html',
      controller: 'MainController',
      controllerAs: 'main',
      resolve: {
        submissions: function ($q, getSubmissions, rankingOf, User, Authentication) {
          return User().then(function (user) {
            var submissions = getSubmissions()
            return $q.all([submissions.$loaded(), rankingOf(user.name).$loaded()]).then(function (s) {
              var submissions = s[0]
              var ranking = s[1]
              _.each(submissions, function (submission, index) {
                if (index >= ranking.length) ranking.$add(submission.$id)
              })
              _.each(ranking, function (rank, index) {
                if (index >= submissions.length) ranking.$remove(index)
              })
              return submissions.$loaded()
            })
          })
        },
        ranking: function (rankingOf, User) {
          return User().then(function (user) {
            return rankingOf(user.name).$loaded()
          })
        },
        randomNames: function ($http) {
          var genders = ['male', 'female']
          var submitters = ['Hugo', 'Amandine']
          return $http.get('random.json').then(function (response) {
            return _.map(response.data, function (name) {
              return {
                name: name,
                gender: _.sample(genders),
                submitter: _.sample(submitters),
                time: new Date(),
              }
            })
          })
        }
      },
      requireLogin: true,
    })
    .otherwise({
      redirectTo: '/names',
    })
})

.run(function ($rootScope, $location, amMoment, Authentication, User) {
  amMoment.changeLanguage('fr')
  $rootScope.$on('$routeChangeStart', function (event, next, current) {
    if (!Authentication.loggedIn() && next.requireLogin) {
      $location.path('/login')
    } else if (Authentication.loggedIn() && next.isLoginPage) {
      $location.path('/names')
    }
  });
  User().then(function (user) {
    $rootScope.loggedIn = true
    $rootScope.user = user
  })
})

.controller('loginController', function ($scope, $location, Authentication, User) {
  var onLoginSucess = function (thirdPartyUser) {
    User.resolve(thirdPartyUser)
    $location.path('/names')
  }

  $scope.busy = true
  Authentication.autoLogin().then(function (user) {
    onLoginSucess(user)
  }).catch(function () {
    $scope.busy = false
  })

  $scope.login = function (provider) {
    $scope.busy = true
    Authentication.manualLogin(provider).then(function (user) {
      onLoginSucess(user)
    }).catch(function (error) {
      $scope.busy = false
      $scope.error = error
      $scope.errorDialogOpened = true
    })
  }
})

.factory('Authentication', function ($firebaseSimpleLogin, submissionFirebaseReference, $rootScope, defer) {
  var firebaseSimpleLogin = $firebaseSimpleLogin(submissionFirebaseReference)
  return {
    autoLogin: function () {
      return defer(function (promise) {
        var unsubscribeFromLoginEvent = $rootScope.$on('$firebaseSimpleLogin:login', function(event, user) {
          unsubscribeFromLoginEvent()
          unsubscribeFromLogoutEvent()
          promise.resolve(user)
        })
        var unsubscribeFromLogoutEvent = $rootScope.$on('$firebaseSimpleLogin:logout', function(event) {
          unsubscribeFromLoginEvent()
          unsubscribeFromLogoutEvent()
          promise.reject()
        })
      })
    },
    manualLogin: function (provider) {
      return firebaseSimpleLogin.$login(provider)
    },
    loggedIn: function () {
      return firebaseSimpleLogin.user !== null
    }
  }
})

.factory('User', function ($q) {
  var defer = $q.defer()
  var getter = function () {
    return defer.promise
  }
  getter.resolve = function (thirdPartyUser) {
    defer.resolve({
      name: thirdPartyUser.thirdPartyUserData.given_name,
    })
  }
  return getter
})

.factory('firebaseUrl', function ($location, $interpolate) {
  var url = 'boiling-fire-3739.firebaseIO.com/apps/names/{{env}}/'
  return function (path) {
    if ($location.host().match(/localhost|127\.0\.0\.1|192\.168\./)) {
      return new Firebase($interpolate(url + path)({env: 'dev'}))
    } else {
      return new Firebase($interpolate(url + path)({env: 'prod'}))
    }
  }
})

.factory('submissionFirebaseReference', function ($firebase, firebaseUrl) {
  return firebaseUrl('submissions')
})

.factory('getSubmissions', function ($firebase, submissionFirebaseReference) {
  return function () {
    return $firebase(submissionFirebaseReference).$asArray()
  }
})

.factory('rankingOf', function ($firebase, firebaseUrl) {
  return function (username) {
    return $firebase(firebaseUrl('rankings/' + username)).$asArray()
  }
})

.filter('mapTo', function () {
  return function (ranking, items) {
    if (!ranking || !items) return
    return _.map(ranking, function (rank) {
      return items[items.$indexFor(rank.$value)]
    })
  }
})

.filter('anonymizeUsing', function ($http) {
  return function (names, randomNames, active) {
    return active ? randomNames : names
  }
})

.controller('MainController', function ($location, submissions, ranking, User, randomNames) {
  var that = this
  User().then(function (user) {
    that.demo = $location.search().demo !== undefined
    that.randomNames = randomNames
    that.names = submissions
    that.ranking = ranking
    that.sortableOptions = (function () {
      var ids
      return {
        handle: '.sortable-handle',
        update: function () {
          ids = _.map(ranking, '$id') // saving the order of ids before modification
        },
        stop: function () {
          if (that.demo) return
          _(ids).zip(ranking).zipObject().each(function (rank, newId) {
            rank.$id = newId
            ranking.$save(rank)
          })
        }
      }
    }())

    that.veto = function (submission) {
      submission.vetoed = !submission.vetoed
      submissions.$save(submission)
    }

    that.name = ''
    that.female = false
    that.submit = function (name) {
      submissions.$add({
        name: name,
        submitter: user.name,
        time: new Date().toISOString(),
        gender: that.female ? 'female' : 'male',
      }).then(function (ref) {
        ranking.$add(ref.name())
      })
      that.name = ''
      that.form.$setPristine()
    }
  })
})

}())
