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

.run(function ($rootScope, $location, FirebaseAuthentication, FirebaseUser) {
  $rootScope.$on('$routeChangeStart', function (event, next) {
    if (!FirebaseAuthentication.loggedIn() && next.requireLogin) {
      $location.path('/login')
    } else if (FirebaseAuthentication.loggedIn() && next.isLoginPage) {
      $location.path('/names')
    }
  })
  FirebaseUser.get().then(function (user) {
    $rootScope.user = {
      isLoggedIn: true,
      name: user.thirdPartyUserData.given_name,
    }
  })
})

.service('User', function (FirebaseUser) {
  this.get = function () {
    return FirebaseUser.get().then(function (firebaseUser) {
      return {
        name: firebaseUser.thirdPartyUserData.given_name,
      }
    })
  }
})

.controller('LoginController', function ($scope, $location, FirebaseAuthentication, FirebaseUser, hgPaperDialog) {
  $scope.busy = true
  FirebaseAuthentication.login()
    .newLoginRequired(function (login) {
      $scope.busy = false
      $scope.login = function(provider) {
        $scope.busy = true
        login(provider)
      }
    })
    .success(function (user) {
      $location.path('/names')
    })
    .error(function (error) {
      $scope.busy = false
      $scope.error = error
      hgPaperDialog('#loginErrorDialog').toggle()
    })
})

}())
