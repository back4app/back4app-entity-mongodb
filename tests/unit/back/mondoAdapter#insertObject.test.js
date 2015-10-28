//
// Created by davimacedo on 28/10/15.
//

var chai = require('chai');
var expect = chai.expect;
var AssertionError = chai.AssertionError;
var Promise = require('bluebird');
var entity = require('@back4app/back4app-entity');
var Entity = entity.models.Entity;
var settings = entity.settings;

require('../settings');

var defaultAdapter = settings.ADAPTERS.default;

describe('MongoAdapter#insertObject', function () {
  it('expect to not work with wrong arguments', function () {
    expect(function () {
      defaultAdapter.insertObject();
    }).to.throw(AssertionError);

    expect(function () {
      defaultAdapter.insertObject({});
    }).to.throw(AssertionError);

    expect(function () {
      defaultAdapter.insertObject(new Entity(), null);
    }).to.throw(AssertionError);
  });

  it('expect to work with entities', function (done) {
    var entity = new Entity();
    defaultAdapter
      .insertObject(entity)
      .then(function () {
        return defaultAdapter.getDatabase();
      })
      .then(function (database) {
        return database
          .collection('Entity')
          .find({_id: entity.id}).toArray();
      })
      .then(function (documents) {
        expect(documents).to.be.an.instanceOf(Array);
        expect(documents).to.have.length(1);
        expect(documents[0]).to.deep.equal({
          _id: entity.id
        });
        return defaultAdapter.getDatabase();
      })
      .then(function (database) {
        return database
          .collection('Entity')
          .deleteOne({
            _id: entity.id
          });
      })
      .then(function () {
        done();
      });
  });
});
