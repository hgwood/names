angular.module('googlePlus', [])

.directive('googlePlusSignIn', function () {
  return {
    restrict: 'EA',
    template: '<span id="googlePlusSignIn"></span>',
    scope: {
      onSignIn: '&',
    },
    link: function (scope) {
      gapi.signin.render('googlePlusSignIn', {
        callback: onGoogleSignIn,
        scope: 'https://www.googleapis.com/auth/plus.login',
        clientId: "782889460853-ue96jooidqdgfse7k5ikanagg1kvacbv.apps.googleusercontent.com",
        theme: "dark",
        cookiepolicy: "single_host_origin",
      });
      function onGoogleSignIn(googleSignInResult) {
        if (googleSignInResult['access_token']) {
          scope.$apply(function () {
            scope.onSignIn();
          });
        } else {
          console.warn(googleSignInResult.error);
        }
      }
    }
  }
})

.service('googlePlus', function ($q) {
  var that = this;

  that.load = function () {
    if (!gapi.client) throw 'The Google API Client is unavailable';
    var result = $q.defer();
    gapi.client.load('plus','v1', function() {
      result.resolve(that);
    });
    return result.promise;
  };

  that.getUsername = function () {
    var result = $q.defer();
    gapi.client.plus.people.get({userId: 'me'}).execute(function (profile) {
      result.resolve(profile.name.givenName);
    });
    return result.promise;
  };

})
