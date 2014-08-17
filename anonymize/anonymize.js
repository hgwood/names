(function () { 'use strict';

angular.module('hgwood.names.anonymize', [])

.factory('anonymizedSubmissionsPromise', function ($http) {
  var genders = ['male', 'female']
  var submitters = ['Hugo', 'Amandine']
  return $http.get('anonymize/anonymizedNames.json').then(function (response) {
    return _.map(response.data, function (name) {
      return {
        name: name,
        gender: _.sample(genders),
        submitter: _.sample(submitters),
        time: new Date(),
      }
    })
  })
})

.filter('anonymizeUsing', function () {
  return function (submissions, anonymousSubmissions, shouldAnonymize) {
    return shouldAnonymize ? _.take(anonymousSubmissions, submissions.length) : submissions
  }
})

}())
