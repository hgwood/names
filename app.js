angular.module('app', ['ngRoute', 'googlePlus', 'ui.bootstrap', 'angularMoment', 'firebase'])

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

.service('user', function (googlePlus) {
  var that = this;

  that.isSignedIn = false;

  that.onSignIn = function () {
    googlePlus.load().then(function () {
      return googlePlus.getUsername();
    }).then(function (username) {
      that.name = username;
      that.isSignedIn = true;
    });
  };

  // DEV MODE
  that.name = 'Hugo';
  that.isSignedIn = true;
})

.controller('NameSubmissionFormController', function ($location, names, user) {
  var that = this;

  that.submission = '';

  that.submit = function (name, rating) {
    names.add({
      name: name,
      submitter: user.name,
      time: new Date(),
      rating: rating,
    });
    that.submission = '';
    that.form.$setPristine();
  };
})

.controller('MainController', function (names, user) {
  var that = this;
  that.loading = true;
  that.names = names.getNames(function () {
    that.loading = false;
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
      var regex = new RegExp(/^([A-Za-zÇÈÉçèéê]+)(?: )?([0-5])?$/);
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
        }
      });
    },
  };
})

.service('names', function ($firebase) {
  var nameFire = $firebase(new Firebase('boiling-fire-3739.firebaseIO.com/dev/names'));

  var that = this;

  that.names = nameFire;
  that.getNames = function (callback) {
    nameFire.$on('loaded', callback);
    return that.names;
  };
  /*that.names = [
    { name: 'Albert', submitter: 'Amandine', time: new Date('2014/05/01'), rating: 4 },
    { name: 'Bernadette', submitter: 'Hugo', time: new Date('2014/04/23'), rating: 3 },
    { name: 'Cruela', submitter: 'Hugo', time: new Date('2014/05/03'), rating: 5 },
    { name: 'Daniela', submitter: 'Amandine', time: new Date('2014/05/03 19:00'), rating: 2 },
  ];*/

  /*that.add = function (name) {
    that.names.push(name);
  };*/
  that.add = nameFire.$add;
})

.service('uniqueness', function() {
  var that = this;
  that.check = function (value, others) {
    return !_.find(others, function (other) { 
      return other === value; 
    });
  };
});
