(function () { 'use strict';

angular.module('app', ['ngRoute', 'ui.bootstrap', 'ui.sortable', 'angularMoment', 'firebase', 'hgDefer', 'hgUnique'])

.config(function ($routeProvider) {
  $routeProvider
    .when('/login', {
      templateUrl: 'login.html',
      controller: 'loginController',
    })
    .when('/names', {
      templateUrl: 'names.html',
      controller: 'MainController',
      controllerAs: 'main',
      resolve: {
        submissions: function (getSubmissions, defer, user, $location) {
          return defer(function (promise) {
            if (!user.loggedIn) {
              promise.reject()
              $location.path('/login')
            } else {
              getSubmissions().$loaded().then(function (submissions) {
                promise.resolve(submissions)
              })
            }
          })
        },
        ranking: function (rankingOf, user) {
          return rankingOf(user.name).$loaded()
        }
      },
    })
    .otherwise({
      redirectTo: '/names',
    })
})

.run(function (amMoment, $rootScope, user) {
  amMoment.changeLanguage('fr')
  $rootScope.user = user
})

.controller('loginController', function ($scope, $location, authentication, user) {
  var onLoginSucess = function (thirdPartyUser) {
    user.set(thirdPartyUser)
    $location.path('/names')
  }

  $scope.busy = true
  $scope.autoLoginInProgress = true
  authentication.autoLogin().then(function (user) {
    onLoginSucess(user)
  }).catch(function () {
    $scope.autoLoginFailed = true
    $scope.busy = false
  })

  $scope.login = function (provider) {
    $scope.busy = true
    authentication.manualLogin(provider).then(function (user) {
      $scope.autoLoginInProgress = false
      $scope.autoLoginFailed = false
      $scope.manuallyLoggedIn = true
      onLoginSucess(user)
    }).catch(function (error) {
      $scope.busy = false
      $scope.error = error
    })
  }
})

.factory('authentication', function ($firebaseSimpleLogin, submissionFirebaseReference, $rootScope, defer) {
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
  }
})

.factory('user', function () {
  var user
  return {
    loggedIn: false,
    set: function (thirdPartyUser) {
      user = thirdPartyUser
      this.name = user.thirdPartyUserData.given_name
      this.loggedIn = true
    },
  }
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

.controller('NameSubmissionFormController', function (getSubmissions, user) {
  var that = this
  var submissions = getSubmissions()
  that.submission = ''
  that.submit = function (name) {
    submissions.$add({
      name: name,
      submitter: user.name,
      time: new Date().toISOString(),
    })
    that.name = ''
    that.form.$setPristine()
  }
})

.filter('orderUsing', function () {
  return function (items, ranking) {
    if (!ranking) return
    return _.map(ranking, function (index) {
      return items[index.$value]
    })
  }
})

.controller('MainController', function (submissions, ranking, user) {
  var that = this
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
        _(ids).zip(ranking).zipObject().each(function (rank, newId) {
          rank.$id = newId
          ranking.$save(rank)
        })
      }
    }
  }())

  that.veto = function (submission) {
    submission.vetoed = !submission.vetoed
    submissions.$save()
  }
})

.controller('SubmissionItemController', function ($scope, user) {
  var that = this
})

}())
