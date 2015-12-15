'use strict';

var expect = require('chai').expect;
var backIndex = require('../../../src/back');
var MongoAdapter = require('../../../src/back/MongoAdapter');

require('../settings');

describe('backIndex', function () {
  it('expect to export MongoAdapter in the MongoAdapter property', function () {
    expect(backIndex).to.have.property('MongoAdapter')
      .that.equals(MongoAdapter);
  });
});
