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

    defaultAdapter
      .insertObject({})
      .catch(function (error) {
        expect(error).to.be.an.instanceOf(AssertionError);
      });

    expect(function () {
      defaultAdapter.insertObject(new Entity(), null);
    }).to.throw(AssertionError);
  });

  it('expect to work with Entity instance', function (done) {
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
        expect(documents[0]).to.deep.equal(
          defaultAdapter.objectToDocument(entity)
        );
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

  it('expect to work with Entity Specialization instance', function (done) {
    var EntitySpecialization = Entity.specify({
      name: 'EntitySpecialization',
      attributes: {
        attribute1Name: {}
      }
    });

    var entitySpecialization = new EntitySpecialization({
      attribute1Name: 'attribute1Value'
    });

    defaultAdapter
      .insertObject(entitySpecialization)
      .then(function () {
        return defaultAdapter.getDatabase();
      })
      .then(function (database) {
        return database
          .collection('Entity')
          .find({_id: entitySpecialization.id}).toArray();
      })
      .then(function (documents) {
        expect(documents).to.be.an.instanceOf(Array);
        expect(documents).to.have.length(1);
        expect(documents[0]).to.deep.equal(
          defaultAdapter.objectToDocument(
            entitySpecialization,
            Entity
          )
        );
        return defaultAdapter.getDatabase();
      })
      .then(function (database) {
        return database
          .collection('Entity')
          .deleteOne({
            _id: entitySpecialization.id
          });
      })
      .then(function () {
        return defaultAdapter.getDatabase();
      })
      .then(function (database) {
        return database
          .collection('EntitySpecialization')
          .find({_id: entitySpecialization.id}).toArray();
      })
      .then(function (documents) {
        expect(documents).to.be.an.instanceOf(Array);
        expect(documents).to.have.length(1);
        expect(documents[0]).to.deep.equal(
          defaultAdapter.objectToDocument(
            entitySpecialization,
            EntitySpecialization
          )
        );
        return defaultAdapter.getDatabase();
      })
      .then(function (database) {
        return database
          .collection('EntitySpecialization')
          .deleteOne({
            _id: entitySpecialization.id
          });
      })
      .then(function () {
        done();
      });
  });

  it(
    'expect to work with all attribute types (association is not in this test)',
    function (done) {
      var MyEntity = Entity.specify({
        name: 'MyEntity',
        attributes: {
          booleanAttribute: {
            type: 'Boolean'
          },
          dateAttribute: {
            type: 'Date'
          },
          numberAttribute: {
            type: 'Number'
          },
          objectAttribute: {
            type: 'Object'
          },
          stringAttribute: {
            type: 'String'
          }
        }
      });

      var myEntity = new MyEntity({
        booleanAttribute: true,
        dateAttribute: new Date(),
        numberAttribute: 123456.7890,
        objectAttribute: { myObject: { myObject: 'myObject' } },
        stringAttribute: 'myStringAttributeValue'
      });

      defaultAdapter
        .insertObject(myEntity)
        .then(function () {
          return defaultAdapter.getDatabase();
        })
        .then(function (database) {
          return database
            .collection('Entity')
            .find({_id: myEntity.id}).toArray();
        })
        .then(function (documents) {
          expect(documents).to.be.an.instanceOf(Array);
          expect(documents).to.have.length(1);
          expect(documents[0]).to.deep.equal(
            defaultAdapter.objectToDocument(
              myEntity,
              Entity
            )
          );
          return defaultAdapter.getDatabase();
        })
        .then(function (database) {
          return database
            .collection('Entity')
            .deleteOne({
              _id: myEntity.id
            });
        })
        .then(function () {
          return defaultAdapter.getDatabase();
        })
        .then(function (database) {
          return database
            .collection('MyEntity')
            .find({_id: myEntity.id}).toArray();
        })
        .then(function (documents) {
          expect(documents).to.be.an.instanceOf(Array);
          expect(documents).to.have.length(1);
          expect(documents[0]).to.deep.equal(
            defaultAdapter.objectToDocument(
              myEntity,
              MyEntity
            )
          );
          return defaultAdapter.getDatabase();
        })
        .then(function (database) {
          return database
            .collection('MyEntity')
            .deleteOne({
              _id: myEntity.id
            });
        })
        .then(function () {
          done();
        });
    }
  );

  after(function (done) {
    defaultAdapter
      .closeConnection()
      .then(done);
  });
});
