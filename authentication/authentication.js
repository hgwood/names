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

.run(function ($rootScope, $location, hgFirebaseAuthentication) {
  $rootScope.$on('$routeChangeStart', function (event, next) {
    if (!hgFirebaseAuthentication.loggedIn() && next.requireLogin) {
      $location.path('/login')
    } else if (hgFirebaseAuthentication.loggedIn() && next.isLoginPage) {
      $location.path('/names')
    }
  })
})

.provider('Authentication', function (hgFirebaseAuthenticationProvider) {
  hgFirebaseAuthenticationProvider.firebaseReference = new Firebase('boiling-fire-3739.firebaseIO.com')
  this.$get = function (hgFirebaseAuthentication) {
    return {
      getCurrentUser: function () {
        return hgFirebaseAuthentication.login().then(function (firebaseUser) {
          return {
            name: firebaseUser.thirdPartyUserData.given_name,
          }
        })
      }
    }
  }
})

.controller('LoginController', function ($scope, $location, hgFirebaseAuthentication, hgPaperDialog) {
  $scope.busy = true
  hgFirebaseAuthentication.login()
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
