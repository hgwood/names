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
              promise.reject();
              $location.path('/login');
            } else {
              var submissions = $firebase(submissionFirebaseReference);
              submissions.$on('loaded', function () {
                upgrade(submissions);
                submissions.$save();
                promise.resolve(submissions);
              });
            }
          });
        },
      },
    })
    .otherwise({
      redirectTo: '/names',
    });
})

.run(function (amMoment, $rootScope, user) {
  amMoment.changeLanguage('fr');
  $rootScope.user = user;
})

.factory('upgrade', function (user) {
  return function (data) {
    _.each(data.$getIndex(), function (key, index) {
      var item = data[key];
      if (item.version === undefined) {
        item.version = 1;
      }
      if (item.version === 1) {
        delete item.ratings;
        item.version = 2;
      }
      if (item.version >= 2) {
        if (angular.isUndefined(item.ranking)) {
          item.ranking = {};
        }
      }
    });
  };
})

.controller('loginController', function ($scope, $location, authentication, user) {
  var onLoginSucess = function (thirdPartyUser) {
    user.set(thirdPartyUser);
    $location.path('/names');
  };

  $scope.busy = true;
  $scope.autoLoginInProgress = true;
  authentication.autoLogin().then(function (user) {
    onLoginSucess(user);
  }).catch(function () {
    $scope.autoLoginFailed = true;
    $scope.busy = false;
  });

  $scope.login = function (provider) {
    $scope.busy = true;
    authentication.manualLogin(provider).then(function (user) {
      $scope.autoLoginInProgress = false;
      $scope.autoLoginFailed = false;
      $scope.manuallyLoggedIn = true;
      onLoginSucess(user);
    }).catch(function (error) {
      $scope.busy = false;
      $scope.error = error;
    });
  };
})

.factory('authentication', function ($firebaseSimpleLogin, submissionFirebaseReference, $rootScope, defer) {
  var firebaseSimpleLogin = $firebaseSimpleLogin(submissionFirebaseReference);
  return {
    autoLogin: function () {
      return defer(function (promise) {
        var unsubscribeFromLoginEvent = $rootScope.$on('$firebaseSimpleLogin:login', function(event, user) {
          unsubscribeFromLoginEvent();
          unsubscribeFromLogoutEvent();
          promise.resolve(user);
        });
        var unsubscribeFromLogoutEvent = $rootScope.$on('$firebaseSimpleLogin:logout', function(event) {
          unsubscribeFromLoginEvent();
          unsubscribeFromLogoutEvent();
          promise.reject();
        });
      });
    },
    manualLogin: function (provider) {
      return firebaseSimpleLogin.$login(provider);
    },
  };
})

.factory('user', function () {
  var user;
  return {
    loggedIn: false,
    set: function (thirdPartyUser) {
      user = thirdPartyUser;
      this.name = user.thirdPartyUserData.given_name;
      this.loggedIn = true;
    },
  }
})

.factory('submissionFirebaseReference', function ($location, $interpolate) {
  var url = 'boiling-fire-3739.firebaseIO.com/apps/names/{{env}}/submissions';
  if ($location.host().match(/localhost|127\.0\.0\.1|192\.168\./)) {
    return new Firebase($interpolate(url)({env: 'dev'}));
  } else {
    return new Firebase($interpolate(url)({env: 'prod'}));
  }
})

.controller('NameSubmissionFormController', function (submissionFirebaseReference, user, $firebase) {
  var that = this;

  that.submission = '';

  that.submit = function (name) {
    var submission = {
      name: name,
      submitter: user.name,
      time: new Date(),
    };
    $firebase(submissionRepository).$add(submission);
    that.name = '';
    that.form.$setPristine();
  };
})

.controller('MainController', function ($scope, submissions, user, orderByPriorityFilter, orderByFilter) {
  var that = this;
  // submissions.$bind($scope, "main.names");
  that.names = submissions;
  that.names.up = function (nameToUp) {
    var names = orderByFilter(orderByPriorityFilter(that.names), that.rank);
    _.each(names, function (name, index) {
      if (name === nameToUp) {
        name.ranking[user.name] -= 1;
        names[index - 1].ranking[user.name] += 1;
      }
    });
    submissions.$save();
  };
  that.names.down = function (nameToDown) {
    var names = orderByFilter(orderByPriorityFilter(that.names), that.rank);
    _.each(names, function (name, index) {
      if (name === nameToDown) {
        name.ranking[user.name] += 1;
        names[index + 1].ranking[user.name] -= 1;
      }
    });
    submissions.$save();
  };
  that.rank = function (submission) {
    if (angular.isUndefined(submission.ranking[user.name]))
      submission.ranking[user.name] = that.names.$getIndex().length + 1;
    return submission.ranking[user.name];
  };
})

.controller('SubmissionItemController', function ($scope, user) {
  var that = this;
})

