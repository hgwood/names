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
        submissions: function (getSubmissions) { return getSubmissions().$loaded() },
        ranking: function (rankingOf, user) { return rankingOf(user.name).$loaded() },
      },
      requireLogin: true,
    })
    .otherwise({
      redirectTo: '/names',
    })
})

.run(function ($rootScope, $location, amMoment, user) {
  amMoment.changeLanguage('fr')
  $rootScope.user = user
  $rootScope.$on('$routeChangeStart', function (event, next, current) {
    if (!user.loggedIn && next.requireLogin) {
      $location.path('/login')
    } else if (user.loggedIn && next.isLoginPage) {
      $location.path('/names')
    }
  });
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
      $scope.errorDialogOpened = true
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
  that.female = false
  that.submit = function (name) {
    submissions.$add({
      name: name,
      submitter: user.name,
      time: new Date().toISOString(),
      gender: that.female ? 'female' : 'male',
    })
    that.name = ''
    that.form.$setPristine()
  }
})

.filter('orderUsing', function () {
  return function (items, ranking) {
    if (!ranking) return
    return _.map(ranking, function (rank) {
      return items[items.$indexFor(rank.$value)]
    })
  }
})

.controller('MainController', function (submissions, ranking, user) {
  _.each(submissions, function (submission, index) {
    if (index >= ranking.length) ranking.$add(submission.$id)
  })
  _.each(ranking, function (rank, index) {
    if (index >= submissions.length) ranking.$remove(index)
  })
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
