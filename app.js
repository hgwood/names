(function () { 'use strict';

angular.module('app', ['ngRoute', 'ui.bootstrap', 'angularMoment', 'firebase', 'hgDefer', 'hgUnique'])

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
        submissions: function ($firebase, submissionFirebaseReference, defer, user, $location, upgrade) {
          return defer(function (promise) {
            if (!user.loggedIn) {
              promise.reject()
              $location.path('/login')
            } else {
              var submissions = $firebase(submissionFirebaseReference)
              submissions.$on('loaded', function () {
                upgrade(submissions)
                submissions.$save()
                promise.resolve(submissions)
              })
            }
          })
        },
        ranking: function ($firebase, rankingFirebaseReference, defer, user) {
          return defer(function (promise) {
            var rankings = $firebase(rankingFirebaseReference)
            rankings.$on('loaded', function () {
              promise.resolve(rankings[user.name])
            })
          })
        },
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

.factory('upgrade', function (user) {
  return function (data) {
    _.each(data.$getIndex(), function (key, index) {
      var item = data[key]
      if (item.version === undefined) {
        item.version = 1
      }
      if (item.version === 1) {
        delete item.ratings
        item.version = 2
      }
      if (item.version >= 2) {
        if (angular.isUndefined(item.ranking)) {
          item.ranking = {}
        }
      }
    })
  }
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

.factory('submissionFirebaseReference', function (firebaseUrl) {
  return firebaseUrl('submissions')
})

.factory('rankingFirebaseReference', function (firebaseUrl) {
  return firebaseUrl('rankings')
})

.controller('NameSubmissionFormController', function (submissionFirebaseReference, user, $firebase, rankingFirebaseReference) {
  var that = this

  var fb = $firebase(submissionFirebaseReference)
  var fbr = $firebase(rankingFirebaseReference)

  that.submission = ''

  that.submit = function (name) {
    var submission = {
      name: name,
      submitter: user.name,
      time: new Date(),
      ranking: {},
      version: 3,
    }
    fb.$add(submission)
    fbr[user.name][fbr[user.name].length] = fbr[user.name].length
    fbr.$save()
    that.name = ''
    that.form.$setPristine()
  }
})

.filter('orderUsing', function () {
  return function (input, ordering) {
    ordering.resize(input.length)
    return ordering.apply(input)
  }
})

.controller('MainController', function (submissions, ranking, Ordering, $firebase, rankingFirebaseReference, user) {
  var f = $firebase(rankingFirebaseReference)
  f.$on('change', function () {
    that.ranking = new Ordering(f[user.name] ? f[user.name] : _.range(submissions.$getIndex().length))
  })
  var that = this
  that.names = submissions
  that.ranking = new Ordering(ranking ? ranking : _.range(submissions.$getIndex().length))
  that.ranking.onChange(function () {
    f[user.name] = that.ranking.orderMap
    f.$save()
  })

  that.veto = function (submission) {
    submission.vetoed = !submission.vetoed
    submissions.$save()
  }
})

.controller('SubmissionItemController', function ($scope, user) {
  var that = this
})

.factory('Ordering', function () {
  function Ordering(orderMap) {
    var that = this
    var _listener
    that.orderMap = orderMap
    that.up = function (index) {
      if (index <= 0 || index > orderMap.length - 1) return
      var pulled = orderMap[index]
      var pushed = orderMap[index - 1]
      orderMap[index] = pushed
      orderMap[index - 1] = pulled
      _listener()
      return that
    }
    that.down = function (index) {
      return that.up(index + 1)
    }
    that.apply = function (array) {
      if (array.length !== orderMap.length)
        throw 'Cannot apply an ordering of length ' + orderMap.length + ' on an array of length ' + array.length + '!'
      return _.map(orderMap, function (index) {
        return array[index]
      })
    }
    that.resize = function (newSize) {
      var i;
      if (newSize > orderMap.length) {
        for (i = orderMap.length; i < newSize; i++) {
          orderMap[i] = i
        }
      } else if (newSize < orderMap.length) {
        for (i = newSize; i < orderMap.length; i++) {
          delete orderMap[i]
        }
        orderMap.length = newSize
      }
    }
    that.onChange = function (listener) {
      _listener = listener
    }
  }
  Ordering.ofLength = function (length) {
    return new Ordering(_.range(length))
  }
  Ordering.for = function (array) {
    return Ordering.ofLength(array.length)
  }
  return Ordering
})

}())
