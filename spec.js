/* global jasmine, describe, it, beforeEach, expect, module, inject */

describe('the Ordering service', function () { 'use strict';

  beforeEach(function () {
    jasmine.addMatchers({
      toContainInOrder: function () {
        return {
          compare: function (actual) {
            var itemsForWhichToCheckOrder = _.tail(arguments)
            return {
              pass: _.reduce(itemsForWhichToCheckOrder, function (orderRespected, item, index) {
                if (index === 0) return true
                var previous = itemsForWhichToCheckOrder[index - 1]
                return orderRespected && _.indexOf(actual, previous) < _.indexOf(actual, item)
              }, true)
            }
          },
        }
      },
    })
  })
  beforeEach(module('app'))

  var Ordering
  beforeEach(inject(['Ordering', function (_Ordering) {
    Ordering = _Ordering
  }]))

  it('swaps two integers by pulling the second one up', function () {
    var input = [0, 1]
    var output = Ordering.for(input).up(1).apply(input)
    expect(output).toContainInOrder(input[1], input[0])
  })

  it('swaps two integers by pushing the first one down', function () {
    var input = [0, 1]
    var output = Ordering.for(input).down(0).apply(input)
    expect(output).toContainInOrder(input[1], input[0])
  })

  it('swaps two strings by pushing the first one down', function () {
    var input = ['0', '1']
    var output = Ordering.for(input).down(0).apply(input)
    expect(output).toContainInOrder(input[1], input[0])
  })

  it('swaps two objects by pushing the first one down', function () {
    var input = [{}, {}]
    var output = Ordering.for(input).down(0).apply(input)
    expect(output).toContainInOrder(input[1], input[0])
  })

  it('re-uses a pre-existing Orderinging', function () {
    var input = [0, 1]
    var output = new Ordering([1, 0]).apply(input)
    expect(output).toContainInOrder(input[1], input[0])
  })

  it('swaps two integers inside a larger collection by pulling the second one up', function () {
    var input = [0, 1, 2, 3]
    var output = Ordering .for(input) .up(2) .apply(input)
    expect(output).toContainInOrder(input[0], input[2], input[1], input[3])
  })

})
