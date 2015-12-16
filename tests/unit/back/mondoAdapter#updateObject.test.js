'use strict';

var chai = require('chai');
var expect = chai.expect;
var AssertionError = chai.AssertionError;
var Promise = require('bluebird');

var entity = require('@back4app/back4app-entity');
var Entity = entity.models.Entity;
var settings = entity.settings;

require('../settings');

var defaultAdapter = settings.ADAPTERS.default;

describe('MongoAdapter#updateObject', function () {
  it('expect to return a promise', function () {
    var result = defaultAdapter.updateObject({});
    expect(result).to.be.instanceOf(Promise);
    result.catch(function () {}); // ignore query errors, only testing type
  });

  it('expect to not work with wrong arguments', function () {
    expect(function () {
      defaultAdapter.updateObject();
    }).to.throw(AssertionError);

    defaultAdapter
      .updateObject({})
      .catch(function (error) {
        expect(error).to.be.an.instanceOf(AssertionError);
      });

    expect(function () {
      defaultAdapter.updateObject(Entity.specify('MyEntity'), null);
    }).to.throw(AssertionError);
  });

  it('expect to work with Entity instance', function (done) {
    var entity = new (Entity.specify(
      'EntityProxy2',
      {
        a1: {}
      }
    ))({ a1: {} });

    defaultAdapter
      .insertObject(entity)
      .then(function () {
        entity.a1 = { a1: 'a1' };
        return defaultAdapter.updateObject(entity);
      })
      .then(function () {
        return defaultAdapter.getDatabase();
      })
      .then(function (database) {
        return database
          .collection('EntityProxy2')
          .find({_id: entity.id}).toArray();
      })
      .then(function (documents) {
        expect(documents).to.be.an.instanceOf(Array);
        expect(documents).to.have.length(1);
        expect(documents[0]).to.deep.equal(
          defaultAdapter.objectToDocument(entity, false)
        );
        return defaultAdapter.getDatabase();
      })
      .then(function (database) {
        return database
          .collection('EntityProxy2')
          .deleteOne({
            _id: entity.id
          });
      })
      .then(function () {
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
      name: 'EntitySpecialization2',
      attributes: {
        attribute1Name: {
          type: 'String'
        }
      }
    });

    var entitySpecialization = new EntitySpecialization({
      attribute1Name: 'attribute1Value'
    });

    defaultAdapter
      .insertObject(entitySpecialization)
      .then(function () {
        entitySpecialization.attribute1Name = 'attribute1ValueModified';
        return defaultAdapter.updateObject(entitySpecialization);
      })
      .then(function () {
        return defaultAdapter.getDatabase();
      })
      .then(function (database) {
        return database
          .collection('EntitySpecialization2')
          .find({_id: entitySpecialization.id}).toArray();
      })
      .then(function (documents) {
        expect(documents).to.be.an.instanceOf(Array);
        expect(documents).to.have.length(1);
        expect(documents[0]).to.deep.equal(
          defaultAdapter.objectToDocument(
            entitySpecialization
          )
        );
        return defaultAdapter.getDatabase();
      })
      .then(function (database) {
        return database
          .collection('EntitySpecialization2')
          .deleteOne({
            _id: entitySpecialization.id
          });
      })
      .then(function () {
        done();
      });
  });

  it('expect to update inheritances correctly', function (done) {
    var A2 = Entity.specify({
      name: 'A2',
      attributes: {
        a1: {type: 'String'},
        a2: {type: 'String'}
      }
    });

    var B2 = A2.specify({
      name: 'B2',
      attributes: {
        b1: {type: 'String'},
        b2: {type: 'String'}
      }
    });

    var entity = new B2({
      a1: 'orig-a1',
      a2: 'orig-a2',
      b1: 'orig-b1',
      b2: 'orig-b2'
    });

    defaultAdapter.insertObject(entity)
      .then(function () {
        entity.a1 = 'new-a1';
        entity.b1 = 'new-b1';
        return defaultAdapter.updateObject(entity);
      })
      .then(function () {
        return defaultAdapter.getDatabase();
      })
      .then(function (database) {
        return database
          .collection('A2')
          .find({_id: entity.id}).toArray();
      })
      .then(function (documents) {
        expect(documents).to.have.length(1);
        expect(documents[0])
          .to.deep.equal(defaultAdapter.objectToDocument(entity, false));
        return defaultAdapter.getDatabase();
      })
      .then(function (database) {
        return database
          .collection('A2')
          .deleteOne({_id: entity.id});
      })
      .then(function () {
        done();
      });
  });

  it('expect to update foreign keys correctly', function (done) {
    var Used = Entity.specify('Used2');

    var Using = Entity.specify(
      'Using2',
      {
        usage: {
          type: 'Used2'
        },
        usages: {
          type: 'Used2',
          multiplicity: '1..*'
        }
      }
    );

    var usage = new Used();
    var usages1 = new Used();
    var usages2 = new Used();

    var using = new Using();

    defaultAdapter
      .insertObject(using)
      .then(function () {
        var promises = [];

        using.usage = usage;
        using.usages = [usages1, usages2];

        promises.push(defaultAdapter.insertObject(usage));
        promises.push(defaultAdapter.insertObject(usages1));
        promises.push(defaultAdapter.insertObject(usages2));
        promises.push(defaultAdapter.updateObject(using));

        Promise
          .all(promises)
          .then(function () {
            defaultAdapter
              .getDatabase()
              .then(function (database) {
                return database
                  .collection('Using2')
                  .find()
                  .toArray();
              })
              .then(function (documents) {
                expect(documents).to.deep.equal([
                  defaultAdapter.objectToDocument(using)
                ]);

                expect(documents[0].usage).to.deep.equal(
                  {
                    Entity: usage.Entity.specification.name,
                    id: usage.id
                  }
                );
                expect(documents[0].usages).to.deep.equal([
                  {
                    Entity: usages1.Entity.specification.name,
                    id: usages1.id
                  },
                  {
                    Entity: usages2.Entity.specification.name,
                    id: usages2.id
                  }
                ]);
              })
              .then(function () {
                var promises = [];

                promises.push(
                  defaultAdapter
                    .getDatabase()
                    .then(function (database) {
                      return database.collection('Used2').deleteMany({});
                    })
                );

                promises.push(
                  defaultAdapter
                    .getDatabase()
                    .then(function (database) {
                      return database.collection('Using2').deleteMany({});
                    })
                );

                return Promise.all(promises);
              })
              .then(function () {
                done();
              });
          });
      });
  });

  after(function (done) {
    defaultAdapter
      .getDatabase()
      .then(function (database) {
        return database.dropDatabase();
      })
      .then(function () {
        return defaultAdapter.closeConnection();
      })
      .then(done);
  });
});
