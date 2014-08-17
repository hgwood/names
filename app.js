(function () { 'use strict';

angular.module('app', [
  'ngRoute',
  'angularMoment', 'ng-polymer-elements', 'ui.bootstrap', 'ui.sortable',
  'firebase',
  'hgDefer', 'hgUnique',
  'hgwood.names.anonymize', 'hgwood.names.authentication',
])

.config(function ($routeProvider, AuthenticationRouterProvider) {
  var submissionsRoute = '/submissions'
  AuthenticationRouterProvider.redirectAfterLoginUrl = submissionsRoute
  $routeProvider
    .when(submissionsRoute, {
      templateUrl: 'names.html',
      controller: 'MainController',
      controllerAs: 'main',
      requireLogin: true,
      resolve: {
        rankedSubmissions: 'rankedSubmissionsPromise',
        anonymizedSubmissions: 'anonymizedSubmissionsPromise',
      },
    })
    .otherwise({
      redirectTo: submissionsRoute,
    })
})

.run(function (amMoment) {
  amMoment.changeLanguage('fr')
})

.factory('FirebaseReferences', function ($location, $firebase) {
  var environment = $location.host().match(/localhost|127\.0\.0\.1|192\.168\./) ? 'dev' : 'prod'
  var rootReference = 'boiling-fire-3739.firebaseIO.com/apps/names/' + environment + '/'
  return {
    submissions: function () {
      return $firebase(new Firebase(rootReference + 'submissions')).$asArray()
    },
    ranking: function (username) {
      return $firebase(new Firebase(rootReference + 'rankings/' + username)).$asArray()
    },
  }
})

.factory('rankedSubmissionsPromise', function ($q, Authentication, FirebaseReferences) {
  return Authentication.getCurrentUser().then(function (user) {
    return $q.all([
      FirebaseReferences.submissions().$loaded(),
      FirebaseReferences.ranking(user.name).$loaded()
    ]).then(function (submissionsAndRanking) {
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

.filter('mapTo', function () {
  return function (ranking, items) {
    if (!ranking || !items) return
    return _.map(ranking, function (rank) {
      return items[items.$indexFor(rank.$value)]
    })
  }
})

.controller('MainController', function ($location, rankedSubmissions, anonymizedSubmissions) {
  var main = this
  main.demo = $location.search().demo !== undefined
  main.anonymizedSubmissions = anonymizedSubmissions
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
