//
// Created by davimacedo on 22/10/15.
//

'use strict';

var chai = require('chai');
var expect = chai.expect;
var AssertionError = chai.AssertionError;
var Promise = require('bluebird');
var mongodb = require('mongodb');
var MongoError = mongodb.MongoError;
var Db = mongodb.Db;
var Collection = mongodb.Collection;
var entity = require('@back4app/back4app-entity');
var settings = entity.settings;
var classes = entity.utils.classes;
var Adapter = entity.adapters.Adapter;
var models = entity.models;
var Entity = models.Entity;
var ObjectAttribute = models.attributes.types.ObjectAttribute;
var MongoAdapter = require('../../../').MongoAdapter;

require('../settings');

var defaultAdapter = settings.ADAPTERS.default;

describe('MongoAdapter', function () {
  var mongoAdapter = null;

  it('expect to be instantiable', function () {
    mongoAdapter = new MongoAdapter('');
    mongoAdapter = new MongoAdapter('', {});
  });

  it('expect to not work with wrong arguments', function () {
    expect(function () {
      mongoAdapter = new MongoAdapter();
    }).to.throw(AssertionError);

    expect(function () {
      mongoAdapter = new MongoAdapter({});
    }).to.throw(AssertionError);

    expect(function () {
      mongoAdapter = new MongoAdapter('', function () {});
    }).to.throw(AssertionError);

    expect(function () {
      mongoAdapter = new MongoAdapter('', {}, null);
    }).to.throw(AssertionError);
  });

  it('expect to be an instance of Adapter', function () {
    expect(classes.isGeneral(Adapter, MongoAdapter));

    expect(mongoAdapter).to.be.an.instanceOf(Adapter);
  });

  describe('#openConnection', function () {
    it('expect to not work with wrong arguments', function () {
      expect(function () {
        defaultAdapter.openConnection(null);
      }).to.throw(AssertionError);
    });

    it('expect to resolve with right connection', function (done) {
      var promise =  defaultAdapter.openConnection();
      expect(promise).to.be.an.instanceOf(Promise);
      promise
        .then(function (result) {
          expect(result).to.be.an('undefined');
          return defaultAdapter.closeConnection();
        })
        .then(done);
    });

    it('expect to reject with invalid parameters', function (done) {
      mongoAdapter = new MongoAdapter(
        '', {}
      );
      var promise = mongoAdapter.openConnection();
      expect(promise).to.be.an.instanceOf(Promise);
      promise.catch(function (error) {
        expect(error).to.be.an.instanceOf(Error);
        done();
      });
    });

    it('expect to reject with wrong connection', function (done) {
      this.timeout(2000);
      mongoAdapter = new MongoAdapter(
        'mongodb://127.0.0.1:6969/?connectTimeoutMS=1000'
      );
      var promise = mongoAdapter.openConnection();
      expect(promise).to.be.an.instanceOf(Promise);
      promise.catch(function (error) {
        expect(error).to.be.an.instanceOf(MongoError);
        done();
      });
    });

    it('expect to work if already opened', function (done) {
      defaultAdapter
        .openConnection()
        .then(function () {
          return defaultAdapter.openConnection();
        })
        .then(function () {
          return defaultAdapter.closeConnection();
        })
        .then(done);
    });

    it('expect to work if asked to open many times', function (done) {
      var total = 10;
      var counter = 0;

      for (var i = 0; i < total; i++) {
        open();
      }

      function open() {
        defaultAdapter
          .openConnection()
          .then(function () {
            return defaultAdapter.closeConnection();
          })
          .then(function () {
            counter++;
            if (counter === total) {
              done();
            }
          });
      }
    });
  });

  describe('#closeConnection', function () {
    it('expect to not work with wrong arguments', function () {
      expect(function () {
        defaultAdapter.closeConnection(null);
      }).to.throw(AssertionError);
    });

    it('expect to resolve', function (done) {
      defaultAdapter.openConnection().then(function () {
        var promise = defaultAdapter.closeConnection();
        expect(promise).to.be.an.instanceOf(Promise);
        promise.then(function (result) {
          expect(result).to.be.an('undefined');
          done();
        });
      });
    });

    it('expect to work if still opening', function (done) {
      defaultAdapter
        .openConnection();

      defaultAdapter
        .closeConnection()
        .then(done);
    });

    it('expect to work if already closed', function (done) {
      defaultAdapter
        .openConnection()
        .then(function () {
          return defaultAdapter.closeConnection();
        })
        .then(function () {
          return defaultAdapter.closeConnection();
        })
        .then(done);
    });

    it('expect to work if asked to close many times', function (done) {
      defaultAdapter
        .openConnection()
        .then(function () {
          var total = 10;
          var counter = 0;

          for (var i = 0; i < total; i++) {
            close();
          }

          function close() {
            defaultAdapter
              .closeConnection()
              .then(function () {
                counter++;
                if (counter === total) {
                  done();
                }
              });
          }
        });
    });
  });

  describe('#getDatabase', function () {
    it('expect to not work with wrong arguments', function () {
      expect(function () {
        defaultAdapter.getDatabase(null);
      }).to.throw(AssertionError);
    });

    it('expect to resolve with right arguments', function (done) {
      var promise = defaultAdapter.getDatabase();
      expect(promise).to.be.an.instanceOf(Promise);
      promise
        .then(function (database) {
          expect(database).to.be.an.instanceOf(Db);
          return database.createCollection('MongoAdapter#getDatabase');
        })
        .then(function (collection) {
          expect(collection).to.be.an.instanceOf(Collection);
          return collection.drop();
        })
        .then(function (result) {
          expect(result).to.equal(true);
          return defaultAdapter.closeConnection();
        })
        .then(done);
    });

    it('expect to reject with invalid parameters', function (done) {
      mongoAdapter = new MongoAdapter(
        '', {}
      );
      var promise = mongoAdapter.getDatabase();
      expect(promise).to.be.an.instanceOf(Promise);
      promise.catch(function (error) {
        expect(error).to.be.an.instanceOf(Error);
        done();
      });
    });

    it('expect to reject with wrong connection', function (done) {
      this.timeout(2000);
      mongoAdapter = new MongoAdapter(
        'mongodb://127.0.0.1:6969/?connectTimeoutMS=1000'
      );
      var promise = mongoAdapter.getDatabase();
      expect(promise).to.be.an.instanceOf(Promise);
      promise.catch(function (error) {
        expect(error).to.be.an.instanceOf(MongoError);
        done();
      });
    });

    it('expect to work if already opened', function (done) {
      defaultAdapter
        .openConnection()
        .then(function () {
          return defaultAdapter.getDatabase();
        })
        .then(function (database) {
          expect(database).to.be.an.instanceOf(Db);
          return database.createCollection('MongoAdapter#getDatabase');
        })
        .then(function (collection) {
          expect(collection).to.be.an.instanceOf(Collection);
          return collection.drop();
        })
        .then(function (result) {
          expect(result).to.equal(true);
          return defaultAdapter.closeConnection();
        })
        .then(done);
    });

    it('expect to work if still opening', function (done) {
      defaultAdapter.openConnection();
      defaultAdapter.getDatabase()
        .then(function (database) {
          expect(database).to.be.an.instanceOf(Db);
          return database.createCollection('MongoAdapter#getDatabase');
        })
        .then(function (collection) {
          expect(collection).to.be.an.instanceOf(Collection);
          return collection.drop();
        })
        .then(function (result) {
          expect(result).to.equal(true);
          return defaultAdapter.closeConnection();
        })
        .then(done);
    });

    it('expect to work if closed', function (done) {
      defaultAdapter
        .openConnection()
        .then(function () {
          return defaultAdapter.closeConnection();
        })
        .then(function () {
          return defaultAdapter.getDatabase();
        })
        .then(function (database) {
          expect(database).to.be.an.instanceOf(Db);
          return database.createCollection('MongoAdapter#getDatabase');
        })
        .then(function (collection) {
          expect(collection).to.be.an.instanceOf(Collection);
          return collection.drop();
        })
        .then(function (result) {
          expect(result).to.equal(true);
          return defaultAdapter.closeConnection();
        })
        .then(done);
    });

    it('expect to work if closing', function (done) {
      defaultAdapter
        .openConnection()
        .then(function () {
          defaultAdapter.closeConnection();
          defaultAdapter
            .getDatabase()
            .then(function (database) {
              expect(database).to.be.an.instanceOf(Db);
              return database.createCollection('MongoAdapter#getDatabase');
            })
            .then(function (collection) {
              expect(collection).to.be.an.instanceOf(Collection);
              return collection.drop();
            })
            .then(function (result) {
              expect(result).to.equal(true);
              return defaultAdapter.closeConnection();
            })
            .then(done);
        });
    });

    it('expect to work many times', function (done) {
      var total = 10;
      var counter = 0;

      defaultAdapter
        .getDatabase()
        .then(function (database) {
          expect(database).to.be.an.instanceOf(Db);
          return database.createCollection('MongoAdapter#getDatabase');
        })
        .then(function (collection) {
          expect(collection).to.be.an.instanceOf(Collection);
          for (var i = 0; i < total; i++) {
            work();
          }
        });

      function work() {
        defaultAdapter
          .getDatabase()
          .then(function (database) {
            expect(database).to.be.an.instanceOf(Db);
            return new Promise(function (resolve) {
              database.collection(
                'MongoAdapter#getDatabase',
                {
                  strict: true
                },
                function (error, collection) {
                  expect(error).to.equal(null);
                  resolve(collection);
                }
              );
            });
          })
          .then(function (collection) {
            expect(collection).to.be.an.instanceOf(Collection);
          })
          .then(function () {
            counter++;
            if (counter === total) {
              defaultAdapter
                .getDatabase()
                .then(function (database) {
                  expect(database).to.be.an.instanceOf(Db);
                  return database.dropCollection('MongoAdapter#getDatabase');
                })
                .then(function (result) {
                  expect(result).to.equal(true);
                  return defaultAdapter.closeConnection();
                })
                .then(done);
            }
          });
      }
    });
  });

  describe('#loadEntity', function () {
    it('expect to not work with wrong arguments', function () {
      expect(function () {
        mongoAdapter.loadEntity();
      }).to.throw(AssertionError);

      expect(function () {
        mongoAdapter.loadEntity(null);
      }).to.throw(AssertionError);

      expect(function () {
        mongoAdapter.loadEntity({});
      }).to.throw(AssertionError);

      expect(function () {
        mongoAdapter.loadEntity(function () {});
      }).to.throw(AssertionError);

      expect(function () {
        mongoAdapter.loadEntity(Entity.specify('MyEntity10'), null);
      }).to.throw(AssertionError);

      expect(function () {
        mongoAdapter.loadEntity(Entity.specify({
          name: 'MyEntity11',
          dataName: 'system.dataName'
        }));
      }).to.throw(AssertionError);

      expect(function () {
        mongoAdapter.loadEntity(Entity.specify({
          name: 'MyEntity11',
          dataName: 'dataName$dataName'
        }));
      }).to.throw(AssertionError);

      expect(function () {
        mongoAdapter.loadEntity(Entity.specify({
          name: 'MyEntity11',
          dataName: 'dataName\0ataName'
        }));
      }).to.throw(AssertionError);

      expect(function () {
        mongoAdapter.loadEntity(Entity.specify({
          name: 'MyEntity12',
          dataName: 'MyEntity12'
        }));

        mongoAdapter.loadEntity(Entity.specify({
          name: 'MyEntity13',
          dataName: 'MyEntity12'
        }));
      }).to.throw(AssertionError);
    });

    it('expect to work with right arguments', function () {
      mongoAdapter.loadEntity(Entity.specify({
        name: 'MyEntity14',
        dataName: 'MyEntity14'
      }));
    });
  });

  describe('#loadEntityAttribute', function () {
    it('expect to not work with wrong arguments', function () {
      expect(function () {
        mongoAdapter.loadEntityAttribute();
      }).to.throw(AssertionError);

      expect(function () {
        mongoAdapter.loadEntityAttribute(null);
      }).to.throw(AssertionError);

      expect(function () {
        mongoAdapter.loadEntityAttribute(null, null);
      }).to.throw(AssertionError);

      expect(function () {
        mongoAdapter.loadEntityAttribute(Entity.specify('Entity15'), null);
      }).to.throw(AssertionError);

      expect(function () {
        mongoAdapter.loadEntityAttribute({}, {});
      }).to.throw(AssertionError);

      expect(function () {
        mongoAdapter.loadEntityAttribute(Entity.specify('Entity16'), {});
      }).to.throw(AssertionError);

      expect(function () {
        mongoAdapter.loadEntityAttribute(function () {}, function () {});
      }).to.throw(AssertionError);

      expect(function () {
        mongoAdapter.loadEntityAttribute(
          Entity.specify('Entity17'),
          function () {}
        );
      }).to.throw(AssertionError);

      expect(function () {
        mongoAdapter.loadEntityAttribute(
          Entity.specify('Entity18'),
          new ObjectAttribute('objectAttribute'),
          null
        );
      }).to.throw(AssertionError);

      expect(function () {
        mongoAdapter.loadEntity(Entity.specify('Entity14'));

        mongoAdapter.loadEntityAttribute(
          Entity.getSpecialization('Entity14'),
          new ObjectAttribute({
            name: 'objectAttribute',
            dataName: '$dataName'
          })
        );
      }).to.throw(AssertionError);

      expect(function () {
        mongoAdapter.loadEntityAttribute(
          Entity.getSpecialization('Entity14'),
          new ObjectAttribute({
            name: 'objectAttribute',
            dataName: 'dataName.dataName'
          })
        );
      }).to.throw(AssertionError);

      expect(function () {
        mongoAdapter.loadEntityAttribute(
          Entity.getSpecialization('Entity14'),
          new ObjectAttribute({
            name: 'objectAttribute',
            dataName: 'dataName\0dataName'
          })
        );
      }).to.throw(AssertionError);

      expect(function () {
        mongoAdapter.loadEntityAttribute(
          Entity.getSpecialization('Entity14'),
          new ObjectAttribute({
            name: 'objectAttribute',
            dataName: 'Entity'
          })
        );
      }).to.throw(AssertionError);

      expect(function () {
        mongoAdapter.loadEntityAttribute(
          Entity.getSpecialization('Entity14'),
          new ObjectAttribute({
            name: 'objectAttribute',
            dataName: '_id'
          })
        );
      }).to.throw(AssertionError);

      expect(function () {
        mongoAdapter.loadEntityAttribute(
          Entity.getSpecialization('Entity15'),
          new ObjectAttribute({
            name: 'objectAttribute',
            dataName: 'dataName'
          })
        );
      }).to.throw(AssertionError);

      expect(function () {
        mongoAdapter.loadEntityAttribute(
          Entity.getSpecialization('Entity14'),
          new ObjectAttribute({
            name: 'objectAttribute',
            dataName: 'dataName'
          })
        );

        mongoAdapter.loadEntityAttribute(
          Entity.getSpecialization('Entity14'),
          new ObjectAttribute({
            name: 'objectAttribute',
            dataName: 'dataName'
          })
        );
      }).to.throw(AssertionError);

      expect(function () {
        mongoAdapter.loadEntityAttribute(
          Entity.getSpecialization('Entity14'),
          new ObjectAttribute({
            name: 'objectAttribute2',
            dataName: 'dataName'
          })
        );
      }).to.throw(AssertionError);
    });

    it('expect to work with right arguments', function () {
      mongoAdapter.loadEntityAttribute(
        Entity.getSpecialization('Entity14'),
        new ObjectAttribute({
          name: 'objectAttribute3',
          dataName: 'dataName3'
        })
      );
    });
  });

  describe('#objectToDocument', function () {
    it('expect to not work with wrong arguments', function () {
      expect(function () {
        mongoAdapter.objectToDocument();
      }).to.throw(AssertionError);

      expect(function () {
        mongoAdapter.objectToDocument(null);
      }).to.throw(AssertionError);

      expect(function () {
        mongoAdapter.objectToDocument({});
      }).to.throw(AssertionError);

      expect(function () {
        mongoAdapter.objectToDocument(new (Entity.specify('Entity20'))(), null);
      }).to.throw(AssertionError);
    });

    it('expect to convert correctly', function () {
      var MyEntity30 = Entity.specify({
        name: 'MyEntity30',
        attributes: {
          a1: {},
          a2: {
            type: 'MyEntity30'
          },
          a3: {
            dataName: 'a3DataName'
          },
          a4: {
            dataName: {
              default: 'a4DataName'
            }
          },
          a5: {
            dataName: {
              default2: 'a5DataName'
            }
          },
          a6: {
            type: 'MyEntity30'
          },
          a7: {}
        }
      });

      var myObject = {
        myObjectAttributeName: 'myObjectAttributeValue'
      };

      var myEntity301 = new MyEntity30();

      var myEntity302 = new MyEntity30({
        a1: myObject,
        a6: myEntity301
      });

      expect(mongoAdapter.objectToDocument(myEntity302)).to.deep.equal({
        Entity: 'MyEntity30',
        _id: myEntity302.id,
        a1: myObject,
        a2: null,
        a3DataName: null,
        a4DataName: null,
        a5: null,
        a6: {
          Entity: 'MyEntity30',
          id: myEntity301.id
        },
        a7: null
      });
    });
  });

  describe('#getEntityCollectionName', function () {
    it('expect to not work with wrong arguments', function () {
      expect(function () {
        mongoAdapter.getEntityCollectionName();
      }).to.throw(AssertionError);

      expect(function () {
        mongoAdapter.getEntityCollectionName(null);
      }).to.throw(AssertionError);

      expect(function () {
        mongoAdapter.getEntityCollectionName({});
      }).to.throw(AssertionError);

      expect(function () {
        mongoAdapter.getEntityCollectionName(function () {});
      }).to.throw(AssertionError);

      expect(function () {
        mongoAdapter.getEntityCollectionName(Entity, null);
      }).to.throw(AssertionError);
    });

    it('expect to get correct names', function () {
      expect(mongoAdapter.getEntityCollectionName(Entity)).to.equal('Entity');

      expect(mongoAdapter.getEntityCollectionName(
        Entity.specify({
          name: 'MyAbstract1',
          isAbstract: true
        })
      )).to.equal('MyAbstract1');

      expect(mongoAdapter.getEntityCollectionName(
        Entity.getSpecialization('MyAbstract1').specify({
          name: 'MyConcrete1',
          isAbstract: false
        })
      )).to.equal('MyConcrete1');

      expect(mongoAdapter.getEntityCollectionName(
        Entity.getSpecialization('MyConcrete1').specify({
          name: 'MyConcrete2',
          isAbstract: false
        })
      )).to.equal('MyConcrete1');

      expect(mongoAdapter.getEntityCollectionName(
        Entity.getSpecialization('MyConcrete2').specify({
          name: 'MyConcrete3',
          isAbstract: false
        })
      )).to.equal('MyConcrete1');

      expect(mongoAdapter.getEntityCollectionName(
        Entity.specify({
          name: 'MyConcrete4',
          isAbstract: false
        })
      )).to.equal('MyConcrete4');
    });
  });
});
