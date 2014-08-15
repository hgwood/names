(function () { 'use strict';

angular.module('app', [
  'ngRoute',
  'angularMoment', 'ng-polymer-elements', 'ui.bootstrap', 'ui.sortable',
  'firebase',
  'hgDefer', 'hgUnique',
  'names.authentication'
])

.config(function ($routeProvider, AuthenticationRouterProvider) {
  var submissionsRoute = '/submissions'
  AuthenticationRouterProvider.redirectAfterLoginUrl = submissionsRoute
  $routeProvider
    .when(submissionsRoute, {
      templateUrl: 'names.html',
      controller: 'MainController',
      controllerAs: 'main',
      resolve: {
        submissions: function ($q, getSubmissions, rankingOf, Authentication) {
          return Authentication.getCurrentUser().then(function (user) {
            var submissions = getSubmissions()
            return $q.all([submissions.$loaded(), rankingOf(user.name).$loaded()]).then(function (s) {
              var submissions = s[0]
              var ranking = s[1]
              _.each(submissions, function (submission, index) {
                if (index >= ranking.length) ranking.$add(submission.$id)
              })
              _.each(ranking, function (rank, index) {
                if (index >= submissions.length) ranking.$remove(index)
              })
              return submissions.$loaded()
            })
          })
        },
        ranking: function (rankingOf, Authentication) {
          return Authentication.getCurrentUser().then(function (user) {
            return rankingOf(user.name).$loaded()
          })
        },
        randomNames: function ($http) {
          var genders = ['male', 'female']
          var submitters = ['Hugo', 'Amandine']
          return $http.get('random.json').then(function (response) {
            return _.map(response.data, function (name) {
              return {
                name: name,
                gender: _.sample(genders),
                submitter: _.sample(submitters),
                time: new Date(),
              }
            })
          })
        }
      },
      requireLogin: true,
    })
    .otherwise({
      redirectTo: submissionsRoute,
    })
})

.run(function ($rootScope, amMoment) {
  amMoment.changeLanguage('fr')
})

.factory('firebaseUrl', function ($location, $interpolate) {
  var url = 'boiling-fire-3739.firebaseIO.com/apps/names/{{env}}/'
  return function (path) {
    if ($location.host().match(/localhost|127\.0\.0\.1|192\.168\./)) {
      return new Firebase($interpolate(url + path)({env: 'dev'}))
    } else {
      return new Firebase($interpolate(url + path)({env: 'prod'}))
    }
  }
})

.factory('submissionFirebaseReference', function ($firebase, firebaseUrl) {
  return firebaseUrl('submissions')
})

.factory('getSubmissions', function ($firebase, submissionFirebaseReference) {
  return function () {
    return $firebase(submissionFirebaseReference).$asArray()
  }
})

.factory('rankingOf', function ($firebase, firebaseUrl) {
  return function (username) {
    return $firebase(firebaseUrl('rankings/' + username)).$asArray()
  }
})

.filter('mapTo', function () {
  return function (ranking, items) {
    if (!ranking || !items) return
    return _.map(ranking, function (rank) {
      return items[items.$indexFor(rank.$value)]
    })
  }
})

.filter('anonymizeUsing', function ($http) {
  return function (names, randomNames, active) {
    return active ? randomNames : names
  }
})

.controller('MainController', function ($location, submissions, ranking, Authentication, randomNames) {
  var that = this
  Authentication.getCurrentUser().then(function (user) {
    that.demo = $location.search().demo !== undefined
    that.randomNames = randomNames
    that.names = submissions
    that.ranking = ranking
    that.sortableOptions = (function () {
      var ids
      return {
        handle: '.sortable-handle',
        update: function () {
          ids = _.map(ranking, '$id') // saving the order of ids before modification
        },
        stop: function () {
          if (that.demo) return
          _(ids).zip(ranking).zipObject().each(function (rank, newId) {
            rank.$id = newId
            ranking.$save(rank)
          })
        }
      }
    }())

    that.veto = function (submission) {
      submission.vetoed = !submission.vetoed
      submissions.$save(submission)
    }

    that.name = ''
    that.female = false
    that.submit = function (name) {
      submissions.$add({
        name: name,
        submitter: user.name,
        time: new Date().toISOString(),
        gender: that.female ? 'female' : 'male',
      }).then(function (ref) {
        ranking.$add(ref.name())
      })
      that.name = ''
      that.form.$setPristine()
    }
  })
})

}())
