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
        templateUrl: 'authentication/authentication.html',
        controller: 'AuthenticationController',
        controllerAs: 'authentication',
        isLoginPage: true,
      })
    return {
      redirectToLogin: function () { $location.path(AuthenticationRouterProvider.loginPageUrl) },
      redirectAfterLogin: function () { $location.path(AuthenticationRouterProvider.redirectAfterLoginUrl) },
    }
  }
})

.controller('AuthenticationController', function (hgFirebaseAuthentication, hgPaperDialog, Authentication, AuthenticationRouter) {
  var authentication = this
  authentication.busy = true
  hgFirebaseAuthentication.login()
    .newLoginRequired(function (login) {
      authentication.busy = false
      authentication.login = function(provider) {
        authentication.busy = true
        login(provider)
      }
    })
    .error(function (error) {
      authentication.busy = false
      authentication.error = error
      hgPaperDialog('#loginErrorDialog').toggle()
    })
    .success(function (user) {
      AuthenticationRouter.redirectAfterLogin()
    })
  Authentication.getCurrentUser().then(function (user) {
    authentication.user = user
  })
})

}())
