(function () { 'use strict';

angular.module('hgDefer', [])

.factory('defer', function ($q) {
  return function (f) {
    var q = $q.defer();
    f(q);
    return q.promise;
  };
});

}());
