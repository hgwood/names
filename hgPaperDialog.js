(function () { 'use strict';

angular.module('hgPaperDialog', [])

.factory('hgPaperDialog', function () {
  return function (selector) {
    var paperDialogElement = angular.element(selector)[0]
    return {
      toggle: function () {
        paperDialogElement.toggle()
      },
    }
  }
})

}())
