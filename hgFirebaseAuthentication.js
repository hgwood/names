(function () { 'use strict';

angular.module('hgFirebaseAuthentication', ['firebase'])

.provider('hgFirebaseAuthentication', function () {
  var hgFirebaseAuthenticationProvider = this
  hgFirebaseAuthenticationProvider.firebaseReference = null
  hgFirebaseAuthenticationProvider.$get = function ($q, $firebaseSimpleLogin) {
    if (!hgFirebaseAuthenticationProvider.firebaseReference) throw new Error('firebaseReference was not set')
    var firebaseSimpleLogin = $firebaseSimpleLogin(hgFirebaseAuthenticationProvider.firebaseReference)
    return {
      loggedIn: function () { return !!firebaseSimpleLogin.user },
      login: function () {
        var success = $q.defer()
        firebaseSimpleLogin.$getCurrentUser().then(function (user) {
          if (user) return success.resolve(user)
          success.notify(function (provider) {
            firebaseSimpleLogin.$login(provider).then(success.resolve, success.notify)
          })
        })
        return _.extend(success.promise, {
          success: function (callback) {
            success.promise.then(callback)
            return success.promise
          },
          error: function (callback) {
            success.promise.then(null, null, function (notification) {
              if (!_.isFunction(notification)) callback(notification)
            })
            return success.promise
          },
          newLoginRequired: function (callback) {
            success.promise.then(null, null, function (notification) {
              if (_.isFunction(notification)) callback(notification)
            })
            return success.promise
          },
        })
      },
    }
  }
})

}())
