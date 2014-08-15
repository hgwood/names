function Mutator(originalObject) {
  'use strict';
  return _.transform(originalObject, function (mutator, method, key) {
    mutator[key] = function () {
      method.apply(mutator, arguments)
      return mutator
    }
  })
}
