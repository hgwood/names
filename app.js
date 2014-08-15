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
        rankedSubmissions: 'rankedSubmissionsPromise',
        randomNames: 'randomNamesPromise',
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

.factory('rankedSubmissionsPromise', function ($q, Authentication, getSubmissions, rankingOf) {
  return Authentication.getCurrentUser().then(function (user) {
    return $q.all([getSubmissions().$loaded(), rankingOf(user.name).$loaded()]).then(function (submissionsAndRanking) {
      var submissions = submissionsAndRanking[0]
      var ranking = submissionsAndRanking[1]
      _.each(submissions, function (submission, index) {
        if (index >= ranking.length) ranking.$add(submission.$id)
      })
      _.each(ranking, function (rank, index) {
        if (index >= submissions.length) ranking.$remove(index)
      })
      var idOrdering = _.map(ranking, '$id')
      return {
        user: user,
        submissions: submissions,
        ranking: ranking,
        add: function (submission) {
          submissions.$add(submission).then(function (ref) {
            ranking.$add(ref.name())
          })
        },
        saveOrdering: function () {
          _(idOrdering).zip(ranking).object().each(function (rank, newId) {
            rank.$id = newId
            ranking.$save(rank)
          })
          idOrdering = _.map(ranking, '$id')
        }
      }
    })
  })
})

.factory('randomNamesPromise', function ($http) {
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
    return active ? _.take(randomNames, names.length) : names
  }
})

.controller('MainController', function ($location, rankedSubmissions, randomNames) {
  var main = this
  main.demo = $location.search().demo !== undefined
  main.randomNames = randomNames
  main.names = rankedSubmissions.submissions
  main.ranking = rankedSubmissions.ranking
  main.sortableOptions = {
    handle: '.sortable-handle',
    stop: function () {
      if (main.demo) return
      rankedSubmissions.saveOrdering()
    }
  }

  main.name = ''
  main.female = false
  main.submit = function (name) {
    rankedSubmissions.add({
      name: name,
      submitter: rankedSubmissions.user.name,
      time: new Date().toISOString(),
      gender: main.female ? 'female' : 'male',
    })
    main.name = ''
    main.form.$setPristine()
  }
})

}())
