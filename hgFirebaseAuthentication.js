(function () { 'use strict';

angular.module('hgFirebaseAuthentication', ['firebase'])

.provider('FirebaseAuthentication', function () {
  var FirebaseAuthenticationProvider = this
  FirebaseAuthenticationProvider.firebaseReference = null
  FirebaseAuthenticationProvider.$get = function ($q, $firebaseSimpleLogin) {
    if (!FirebaseAuthenticationProvider.firebaseReference) throw new Error('firebaseReference was not set')
    var firebaseSimpleLogin = $firebaseSimpleLogin(FirebaseAuthenticationProvider.firebaseReference)
    var loginSuccess = $q.defer()
    return {
      loggedIn: function () { return !!firebaseSimpleLogin.user },
      login: function () {
        loginSuccess = $q.defer()
        var newLoginRequired = $q.defer()
        firebaseSimpleLogin.$getCurrentUser().then(function (user) {
          if (user) return loginSuccess.resolve(user)
          newLoginRequired.resolve(function (provider) {
            firebaseSimpleLogin.$login(provider).then(
              function (user) { loginSuccess.resolve(user) },
              function (error) { loginSuccess.notify(error) })
          })
        })
        return Mutator({
          success: function (callback) { loginSuccess.promise.then(callback) },
          error: function (callback) { loginSuccess.promise.then(null, null, callback) },
          newLoginRequired: function (callback) { newLoginRequired.promise.then(callback) },
        })
      },
      getUser: function () {
        return loginSuccess.promise
      }
    }
  }
})

}())
