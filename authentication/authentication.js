(function () { 'use strict';

angular.module('names.authentication', ['ngRoute', 'hgFirebaseAuthentication'])

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

.controller('LoginController', function ($scope, $location, FirebaseAuthentication, FirebaseUser) {
  var onLoginSucess = function (thirdPartyUser) {
    FirebaseUser.set(thirdPartyUser)
    $location.path('/names')
  }

  $scope.busy = true
  FirebaseAuthentication.autoLogin().then(function (user) {
    onLoginSucess(user)
  }).catch(function () {
    $scope.busy = false
  })

  $scope.login = function (provider) {
    $scope.busy = true
    FirebaseAuthentication.manualLogin(provider).then(function (user) {
      onLoginSucess(user)
    }).catch(function (error) {
      $scope.busy = false
      $scope.error = error
      $scope.errorDialogOpened = true
    })
  }
})

}())
