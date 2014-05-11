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
      resolve: {
        checkAuthentication: function ($location, user) {
          if (!user.loggedIn) {
            $location.path('/login');
          }
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

.controller('loginController', function ($scope, $location, authentication, user) {
  var onLoginSucess = function (thirdPartyUser) {
    user.set(thirdPartyUser);
    $location.path('/names');
  };

  $scope.loggingIn = true;
  authentication.autoLogin().then(function (user) {
    onLoginSucess(user);
  }).catch(function () {
    $scope.loggingIn = false;
  });

  $scope.login = function (provider) {
    $scope.loggingIn = true;
    authentication.manualLogin(provider).then(function (user) {
      onLoginSucess(user);
    }).catch(function (error) {
      $scope.loggingIn = false;
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

.service('user', function () {
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

.factory('submissionRepository', function ($firebase, submissionFirebaseReference) {
  return submissionFirebaseReference;
})

.controller('NameSubmissionFormController', function (submissionRepository, user, $firebase) {
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

.controller('MainController', function ($scope, submissionRepository, $firebase) {
  var that = this;
  submissionRepository = $firebase(submissionRepository);
  that.loading = true;
  submissionRepository.$on('loaded', function () {
    that.loading = false;
  });
  submissionRepository.$bind($scope, "main.names");
})

.controller('SubmissionItemController', function ($scope, user) {
  var that = this;
})

.directive('hgUniqueAmong', function (uniqueness) {
  return {
    require: 'ngModel',
    restrict: 'A',
    scope: {
      model: '=ngModel',
      others: '=hgUniqueAmong',
      field: '@hgUniqueField',
    },
    link: function (scope, element, attrs, ngModel) {
      scope.$watch('model', function (model) {
        ngModel.$setValidity('unique', !model || uniqueness.check(scope.model, scope.others, scope.field));
      });
    },
  };
})

.service('uniqueness', function() {
  var that = this;
  that.check = function (value, others, field) {
    return !_.find(others, function (other) { 
      return value === (field ? other[field] : other);
    });
  };
});
