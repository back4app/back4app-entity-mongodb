//
// Created by davimacedo on 28/10/15.
//

'use strict';

var chai = require('chai');
var expect = chai.expect;
var AssertionError = chai.AssertionError;
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
      defaultAdapter.insertObject(Entity.specify('MyEntity'), null);
    }).to.throw(AssertionError);
  });

  it('expect to work with Entity instance', function (done) {
    var entity = new (Entity.specify('EntityProxy'))();

    defaultAdapter
      .insertObject(entity)
      .then(function () {
        return defaultAdapter.getDatabase();
      })
      .then(function (database) {
        return database
          .collection('EntityProxy')
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
          .collection('EntityProxy')
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
      name: 'EntitySpecialization',
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
            entitySpecialization
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
      var MyEntity2 = Entity.specify({
        name: 'MyEntity2',
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

      var myEntity = new MyEntity2({
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
            .collection('MyEntity2')
            .find({_id: myEntity.id}).toArray();
        })
        .then(function (documents) {
          expect(documents).to.be.an.instanceOf(Array);
          expect(documents).to.have.length(1);
          expect(documents[0]).to.deep.equal(
            defaultAdapter.objectToDocument(
              myEntity
            )
          );
          return defaultAdapter.getDatabase();
        })
        .then(function (database) {
          return database
            .collection('MyEntity2')
            .deleteOne({
              _id: myEntity.id
            });
        })
        .then(function () {
          done();
        });
    }
  );

  it('expect to insert inheritances correctly', function (done) {
    var A = Entity.specify({
      name: 'A',
      attributes: {
        a1: {
          type: 'String'
        },
        a2: {
          type: 'String'
        }
      }
    });

    var B = A.specify({
      name: 'B',
      attributes: {
        b1: {
          type: 'String'
        },
        b2: {
          type: 'String'
        }
      }
    });

    var C = B.specify({
      name: 'C',
      attributes: {
        c1: {
          type: 'String'
        },
        c2: {
          type: 'String'
        }
      }
    });

    var a = new A({
      a1: 'aa1',
      a2: 'aa2'
    });

    var b = new B({
      a1: 'ba1',
      a2: 'ba2',
      b1: 'bb1',
      b2: 'bb2'
    });

    var c = new C({
      a1: 'ca1',
      a2: 'ca2',
      b1: 'cb1',
      b2: 'cb2',
      c1: 'cc1',
      c2: 'cc2'
    });

    var counter = 0;

    insertObjects();

    function insertObjects() {
      defaultAdapter
        .insertObject(a)
        .then(checkResults);

      defaultAdapter
        .insertObject(b)
        .then(checkResults);

      defaultAdapter
        .insertObject(c)
        .then(checkResults);
    }

    function checkResults() {
      counter++;

      if (counter === 3) {
        counter = 0;

        defaultAdapter
          .getDatabase()
          .then(function (database) {
            return database
              .collection('Entity')
              .find({})
              .toArray();
          })
          .then(function (documents) {
            expect(documents).to.deep.equal([]);

            finalize();
          });

        defaultAdapter
          .getDatabase()
          .then(function (database) {
            return database
              .collection('A')
              .find()
              .toArray();
          })
          .then(function (documents) {
            expect(documents).to.deep.equal([
              defaultAdapter.objectToDocument(a),
              defaultAdapter.objectToDocument(b),
              defaultAdapter.objectToDocument(c)
            ]);

            finalize();
          });

        defaultAdapter
          .getDatabase()
          .then(function (database) {
            return database
              .collection('B')
              .find()
              .toArray();
          })
          .then(function (documents) {
            expect(documents).to.deep.equal([]);

            finalize();
          });

        defaultAdapter
          .getDatabase()
          .then(function (database) {
            return database
              .collection('C')
              .find()
              .toArray();
          })
          .then(function (documents) {
            expect(documents).to.deep.equal([]);

            finalize();
          });
      }
    }

    function finalize() {
      counter++;

      if (counter === 4) {
        counter = 0;

        defaultAdapter
          .getDatabase()
          .then(function (database) {
            return database.collection('Entity').deleteMany({});
          })
          .then(callDone);

        defaultAdapter
          .getDatabase()
          .then(function (database) {
            return database.collection('A').deleteMany({});
          })
          .then(callDone);

        defaultAdapter
          .getDatabase()
          .then(function (database) {
            return database.collection('B').deleteMany({});
          })
          .then(callDone);

        defaultAdapter
          .getDatabase()
          .then(function (database) {
            return database.collection('C').deleteMany({});
          })
          .then(callDone);
      }
    }

    function callDone() {
      counter++;

      if (counter === 4) {
        done();
      }
    }
  });

  it('expect to insert foreign keys correctly', function (done) {
    var Used = Entity.specify('Used');

    var Using = Entity.specify(
      'Using',
      {
        usage: {
          type: 'Used'
        },
        usages: {
          type: 'Used',
          multiplicity: '1..*'
        }
      }
    );

    var usage = new Used();
    var usages1 = new Used();
    var usages2 = new Used();

    var using = new Using({
      usage: usage,
      usages: [
        usages1,
        usages2
      ]
    });

    var promises = [];
    promises.push(defaultAdapter.insertObject(usage));
    promises.push(defaultAdapter.insertObject(usages1));
    promises.push(defaultAdapter.insertObject(usages2));
    promises.push(defaultAdapter.insertObject(using));

    Promise
      .all(promises)
      .then(function () {
        defaultAdapter
          .getDatabase()
          .then(function (database) {
            return database
              .collection('Using')
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
                  return database.collection('Used').deleteMany({});
                })
            );

            promises.push(
              defaultAdapter
                .getDatabase()
                .then(function (database) {
                  return database.collection('Using').deleteMany({});
                })
            );

            return Promise.all(promises);
          })
          .then(function () {
            done();
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
