(function () { 'use strict';

angular.module('hgFirebaseAuthentication', ['firebase', 'hgDefer'])

.provider('FirebaseAuthentication', function () {
  var FirebaseAuthenticationProvider = this
  FirebaseAuthenticationProvider.firebaseReference = null
  FirebaseAuthenticationProvider.$get = function ($q, $firebaseSimpleLogin, defer, FirebaseUser) {
    if (!FirebaseAuthenticationProvider.firebaseReference) throw new Error('firebaseReference was not set')
    var firebaseSimpleLogin = $firebaseSimpleLogin(FirebaseAuthenticationProvider.firebaseReference)
    return {
      loggedIn: function () { return !!firebaseSimpleLogin.user },
      login: function () {
        var newLoginRequired = $q.defer()
        var success = $q.defer()
        success.promise.then(function (user) {
          FirebaseUser.set(user)
        })
        firebaseSimpleLogin.$getCurrentUser().then(function (user) {
          if (user) return success.resolve(user)
          newLoginRequired.resolve(function (provider) {
            firebaseSimpleLogin.$login(provider).then(
              function (user) { success.resolve(user) },
              function (error) { success.notify(error) })
          })
        })
        return Mutator({
          success: function (callback) { success.promise.then(callback) },
          error: function (callback) { success.promise.then(null, null, callback) },
          newLoginRequired: function (callback) { newLoginRequired.promise.then(callback) },
        })
      }
    }
  }
})

.service('FirebaseUser', function ($q) {
  var defer = $q.defer()
  this.get = function () {
    return defer.promise
  }
  this.set = function (user) {
    defer.resolve(user)
  }
})

}())
