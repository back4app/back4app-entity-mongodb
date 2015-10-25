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
        'mongodb://127.0.0.1:6969?connectTimeoutMS=1000'
      );
      var promise = mongoAdapter.openConnection();
      expect(promise).to.be.an.instanceOf(Promise);
      promise.catch(function (error) {
        expect(error).to.be.an.instanceOf(MongoError);
        done();
      });
    });

    it('expect to work if still opened', function (done) {
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

    it('expect to work if still closed', function (done) {
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

    it('expect to work with right arguments', function (done) {
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
  });
});
