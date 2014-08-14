(function () { 'use strict';

angular.module('hgFirebaseAuthentication', ['firebase'])

.provider('FirebaseAuthentication', function () {
  var that = this
  that.firebaseReference = null
  that.$get = function ($rootScope, $firebaseSimpleLogin, defer) {
    if (!that.firebaseReference) throw new Error('firebaseReference was not set')
    var firebaseSimpleLogin = $firebaseSimpleLogin(that.firebaseReference)
    return {
      autoLogin: function () {
        return defer(function (promise) {
          var unsubscribeFromLoginEvent = $rootScope.$on('$firebaseSimpleLogin:login', function(event, user) {
            unsubscribeFromLoginEvent()
            unsubscribeFromLogoutEvent()
            promise.resolve(user)
          })
          var unsubscribeFromLogoutEvent = $rootScope.$on('$firebaseSimpleLogin:logout', function(event) {
            unsubscribeFromLoginEvent()
            unsubscribeFromLogoutEvent()
            promise.reject()
          })
        })
      },
      manualLogin: function (provider) {
        return firebaseSimpleLogin.$login(provider)
      },
      loggedIn: function () {
        return firebaseSimpleLogin.user !== null
      }
    }
  }
})

.factory('FirebaseUser', function ($q) {
  var defer = $q.defer()
  var getter = function () {
    return defer.promise
  }
  getter.resolve = function (user) {
    defer.resolve(user)
  }
  return getter
})

}())
