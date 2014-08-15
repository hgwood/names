(function () { 'use strict';

angular.module('names.authentication', ['ngRoute', 'hgFirebaseAuthentication', 'hgPaperDialog'])

.config(function ($routeProvider) {
  $routeProvider
    .when('/login', {
      templateUrl: 'login.html',
      controller: 'LoginController',
      isLoginPage: true,
    })
})

.run(function ($rootScope, $location, FirebaseAuthentication) {
  $rootScope.$on('$routeChangeStart', function (event, next) {
    if (!FirebaseAuthentication.loggedIn() && next.requireLogin) {
      $location.path('/login')
    } else if (FirebaseAuthentication.loggedIn() && next.isLoginPage) {
      $location.path('/names')
    }
  })
})

.service('User', function (FirebaseAuthentication) {
  this.get = function () {
    return FirebaseAuthentication.login().then(function (firebaseUser) {
      return {
        name: firebaseUser.thirdPartyUserData.given_name,
      }
    })
  }
})

.controller('LoginController', function ($scope, $location, FirebaseAuthentication, hgPaperDialog) {
  $scope.busy = true
  FirebaseAuthentication.login()
    .newLoginRequired(function (login) {
      $scope.busy = false
      $scope.login = function(provider) {
        $scope.busy = true
        login(provider)
      }
    })
    .error(function (error) {
      $scope.busy = false
      $scope.error = error
      hgPaperDialog('#loginErrorDialog').toggle()
    })
    .success(function (user) {
      $scope.user = {
        isLoggedIn: true,
        name: user.thirdPartyUserData.given_name,
      }
      $location.path('/names')
    })
})

}())
