angular.module('app', ['ngRoute', 'ui.bootstrap', 'angularMoment', 'firebase'])

.config(function ($routeProvider) {
  $routeProvider
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

.value('submissionFirebaseReference', new Firebase('boiling-fire-3739.firebaseIO.com/apps/names/dev/submissions'))

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

.factory('submissionRepository', function ($firebase, submissionFirebaseReference) {
  return $firebase(submissionFirebaseReference);
})

.service('user', function (authentication) {
  var that = this;
  that.isSignedIn = false;
  that.errorMessage = '';
  authentication.onLogin(function (user) {
    that.errorMessage = '';
    that.isSignedIn = true;
    that.name = user.thirdPartyUserData.given_name;
  });
  authentication.onLogout(function () {
    that.isSignedIn = false;
  });
  authentication.onError(function (error) {
    that.isSignedIn = false;
    that.errorMessage = error.message;
  });
  that.login = authentication.login;
  that.logout = authentication.logout;
})

.controller('NameSubmissionFormController', function (submissionRepository, user) {
  var that = this;

  that.submission = '';

  that.submit = function (name, rating) {
    submissionRepository.$add({
      name: name,
      submitter: user.name,
      time: new Date(),
      rating: rating,
    });
    that.submission = '';
    that.form.$setPristine();
  };
})

.controller('MainController', function (submissionRepository, authentication) {
  var that = this;
  authentication.onLogin(function () {
    that.loading = true;
    submissionRepository.$on('loaded', function () {
      that.loading = false;
    });
    that.names = submissionRepository;
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
