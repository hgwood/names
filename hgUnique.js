(function () { 'use strict';

angular.module('hgUnique', [])

.directive('hgUniqueAmong', function (uniqueness) {
  return {
    require: 'ngModel',
    restrict: 'A',
    scope: {
      model: '=ngModel',
      others: '=hgUniqueAmong',
      field: '@hgUniqueField',
    },
    link: function (scope, element, attrs, ngModel) {
      scope.$watch('model', function (model) {
        ngModel.$setValidity('unique', !model || uniqueness.check(scope.model, scope.others, scope.field));
      });
    },
  };
})

.service('uniqueness', function() {
  var that = this;
  that.check = function (value, others, field) {
    return !_.find(others, function (other) {
      return value === (field ? other[field] : other);
    });
  };
});

}())
