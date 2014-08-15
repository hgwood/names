(function () { 'use strict';

angular.module('names.authentication', [
  'ngRoute',
  'hgFirebaseAuthentication',
  'hgPaperDialog',
])

.run(function ($rootScope, Authentication, AuthenticationRouter) {
  $rootScope.$on('$routeChangeStart', function (event, next) {
    if (!Authentication.loggedIn() && next.requireLogin) {
      AuthenticationRouter.redirectToLogin()
    } else if (Authentication.loggedIn() && next.isLoginPage) {
      AuthenticationRouter.redirectAfterLogin()
    }
  })
})

.provider('Authentication', function (hgFirebaseAuthenticationProvider) {
  hgFirebaseAuthenticationProvider.firebaseReference = new Firebase('boiling-fire-3739.firebaseIO.com')
  this.$get = function (hgFirebaseAuthentication) {
    return {
      loggedIn: hgFirebaseAuthentication.loggedIn,
      getCurrentUser: function () {
        return hgFirebaseAuthentication.login().then(function (firebaseUser) {
          return {
            name: firebaseUser.thirdPartyUserData.given_name,
          }
        })
      },
    }
  }
})

.provider('AuthenticationRouter', function ($routeProvider) {
  var AuthenticationRouterProvider = this
  AuthenticationRouterProvider.loginPageUrl = '/login'
  AuthenticationRouterProvider.redirectAfterLoginUrl = '/loggedIn'
  this.$get = function ($location) {
    $routeProvider
      .when(AuthenticationRouterProvider.loginPageUrl, {
        templateUrl: 'login.html',
        controller: 'LoginController',
        isLoginPage: true,
      })
    return {
      redirectToLogin: function () { $location.path(AuthenticationRouterProvider.loginPageUrl) },
      redirectAfterLogin: function () { $location.path(AuthenticationRouterProvider.redirectAfterLoginUrl) },
    }
  }
})

.controller('LoginController', function ($scope, hgFirebaseAuthentication, hgPaperDialog, Authentication, AuthenticationRouter) {
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
      AuthenticationRouter.redirectAfterLogin()
    })
  Authentication.getCurrentUser().then(function (user) {
    $scope.user = user
  })
})

}())
