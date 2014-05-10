angular.module('app', ['ngRoute', 'ui.bootstrap', 'angularMoment', 'firebase', 'hgDefer'])

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
    })
    .otherwise({
      redirectTo: '/names',
    });
})

.run(function (amMoment, $rootScope, user) {
  amMoment.changeLanguage('fr');
  $rootScope.user = user;
})

.controller('loginController', function ($scope, $location, authenticationp, user) {
  var onLoginSucess = function (thirdPartyUser) {
    user.set(thirdPartyUser);
    $location.path('/names');
  };

  $scope.loggingIn = true;
  authenticationp.autoLogin().then(function (user) {
    onLoginSucess(user);
  }).catch(function () {
    $scope.loggingIn = false;
  });

  $scope.login = function (provider) {
    $scope.loggingIn = true;
    authenticationp.manualLogin(provider).then(function (user) {
      onLoginSucess(user);
    }).catch(function (error) {
      $scope.loggingIn = false;
      $scope.error = error;
    });
  };
})



.factory('submissionFirebaseReference', function ($location, $interpolate) {
  var url = 'boiling-fire-3739.firebaseIO.com/apps/names/{{env}}/submissions';
  if ($location.host().match(/localhost|127\.0\.0\.1|192\.168\./)) {
    return new Firebase($interpolate(url)({env: 'dev'}));
  } else {
    return new Firebase($interpolate(url)({env: 'prod'}));
  }
})

.factory('authenticationp', function ($firebaseSimpleLogin, submissionFirebaseReference, $rootScope, defer) {
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

.factory('authentication', function ($firebaseSimpleLogin, submissionFirebaseReference, $rootScope, $q) {
  var firebaseSimpleLogin = $firebaseSimpleLogin(submissionFirebaseReference);
  return {
    login: function () {
      firebaseSimpleLogin.$login('google'); 
    },
    logout: firebaseSimpleLogin.$logout,
    getUser: firebaseSimpleLogin.$getCurrentUser,

    onLogin: function (callback) {
      $rootScope.$on('$firebaseSimpleLogin:login', function(event, user) {
        callback(user);
      });
    },

    onError: function (callback) {
      $rootScope.$on('$firebaseSimpleLogin:error', function(event, error) {
        callback(error);
      });
    },

    onLogout: function (callback) {
      $rootScope.$on('$firebaseSimpleLogin:logout', function(event) {
        callback();
      });
    },
  };
})

.service('ratingService', function (user) {
  var that = this;
  
  that.hasBeenRatedBy = function (submission, username) {
    return submission.ratings[username] > 0;
  };

  that.averageRating = function (submission) {
    if (!that.hasBeenRatedBy(submission, user.name)) return 0;
    var ratings = _.values(submission.ratings);
    var sum = _.reduce(ratings, function (sum, rating) { return sum += rating; });
    var avg = sum / ratings.length;
    return avg;
  };
})

.factory('submissionRepository', function ($firebase, submissionFirebaseReference, authentication) {
  return submissionFirebaseReference;
})

.service('user', function (authentication) {
  var user;
  return {
    set: function (thirdPartyUser) {
      user = thirdPartyUser;
      this.name = user.thirdPartyUserData.given_name; 
    },
  }
})

.controller('NameSubmissionFormController', function (submissionRepository, user, $firebase) {
  var that = this;

  that.submission = '';

  that.submit = function (name, rating) {
    var ratings = {};
    ratings[user.name] = rating;
    var submission = {
      name: name,
      submitter: user.name,
      time: new Date(),
      ratings: ratings,
    };
    $firebase(submissionRepository).$add(submission);
    that.submission = '';
    that.form.$setPristine();
  };
})

.controller('MainController', function ($scope, submissionRepository, authentication, $firebase) {
  var that = this;
  authentication.onLogin(function () {
    submissionRepository = $firebase(submissionRepository);
    that.loading = true;
    submissionRepository.$on('loaded', function () {
      that.loading = false;
    });
    submissionRepository.$bind($scope, "main.names");
  });
})

.controller('SubmissionItemController', function ($scope, user, ratingService) {
  var that = this;

  that.hasBeenRatedBy = ratingService.hasBeenRatedBy;
  that.rating = $scope.name.ratings[user.name];

  var unwatch = $scope.$watch('submission.rating', function (rating) {
    if (!$scope.name.ratings) return;
    if (!that.rating) return;
    $scope.name.ratings[user.name] = rating;
    that.rating = ratingService.averageRating($scope.name);
    unwatch();
  });
})

.directive('hgParseAsNameAndRating', function (uniqueness) {
  return {
    require: 'ngModel',
    restrict: 'A',
    scope: {
      model: '=ngModel',
      name: '=hgName',
      names: '=hgNameUniqueAmong',
      rating: '=hgRating',
    },
    link: function (scope, element, attrs, ngModel) {
      var regex = new RegExp(/^([A-Za-zÇÈÉçèéê\-]+)(?: )?([0-5])?$/);
      scope.$watch('model', function (newValue) {
        if (angular.isUndefined(newValue)) newValue = '';
        var match = regex.exec(newValue);
        if (match) {
          scope.name = _.str.capitalize(match[1]);
          scope.rating = match[2] ? parseInt(match[2], 10) : 0;
          ngModel.$setValidity('ratingMissing', !!match[2]);
          ngModel.$setValidity('pattern', true);
          if (scope.names) {
            ngModel.$setValidity('unique', uniqueness.check(scope.name, _.pluck(scope.names, 'name')));
          }
        } else {
          scope.name = _.str.capitalize(newValue);;
          scope.rating = 0;
          ngModel.$setValidity('pattern', !newValue);
          ngModel.$setValidity('unique', true);
        }
      });
    },
  };
})

.service('uniqueness', function() {
  var that = this;
  that.check = function (value, others) {
    return !_.find(others, function (other) { 
      return other === value; 
    });
  };
});
