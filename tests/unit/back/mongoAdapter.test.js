//
// Created by davimacedo on 22/10/15.
//

'use strict';

var chai = require('chai');
var expect = chai.expect;
var AssertionError = chai.AssertionError;
var Promisse = require('bluebird');
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
    mongoAdapter = new MongoAdapter();
    mongoAdapter = new MongoAdapter('');
    mongoAdapter = new MongoAdapter('', {});
  });

  it('expect to not work with wrong arguments', function () {
    expect(function () {
      mongoAdapter = new MongoAdapter('', {}, null);
    }).to.throw(AssertionError);
  });

  it('expect to be an instance of Adapter', function () {
    expect(classes.isGeneral(Adapter, MongoAdapter));
  });

  describe('#openConnection', function () {
    it('expect to not work with wrong arguments', function () {
      expect(function () {
        defaultAdapter.openConnection(null);
      }).to.throw(AssertionError);
    });

    it('expect to not work when in invalid state', function (done) {
      mongoAdapter = new MongoAdapter();
      mongoAdapter.openConnection()
        .catch(function (error) {
          expect(error).to.be.an.instanceOf(AssertionError);

          mongoAdapter = new MongoAdapter({});
          mongoAdapter.openConnection()
            .catch(function (error) {
              expect(error).to.be.an.instanceOf(AssertionError);

              mongoAdapter = new MongoAdapter(
                'mongodb://127.0.0.1:27017',
                function () {}
              );
              mongoAdapter.openConnection()
                .catch(function (error) {
                  expect(error).to.be.an.instanceOf(AssertionError);
                  done();
                });
            });
        });
    });

    it('expect to resolve with right connection', function (done) {
      var promise =  defaultAdapter.openConnection();
      expect(promise).to.be.an.instanceOf(Promisse);
      promise.then(function (result) {
        expect(result).to.be.an('undefined');
        defaultAdapter.closeConnection().then(function () {
          done();
        });
      });
    });

    it('expect to reject with invalid parameters', function (done) {
      mongoAdapter = new MongoAdapter(
        '', {}
      );
      var promise = mongoAdapter.openConnection();
      expect(promise).to.be.an.instanceOf(Promisse);
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
      expect(promise).to.be.an.instanceOf(Promisse);
      promise.catch(function (error) {
        expect(error).to.be.an.instanceOf(Error);
        done();
      });
    });

    it('expect to not connect twice', function (done) {
      defaultAdapter.openConnection().then(function () {
        defaultAdapter.openConnection().catch(function (error) {
          expect(error).to.be.an.instanceOf(AssertionError);
          defaultAdapter.closeConnection().then(function () {
            done();
          });
        });
      });

      defaultAdapter.openConnection()
        .then(function () {
          throw new Error();
        })
        .catch(function (error) {
          expect(error).to.be.an.instanceOf(AssertionError);
        }
      );
    });
  });

  describe('#closeConnection', function () {
    it('expect to not work with wrong arguments', function () {
      expect(function () {
        defaultAdapter.closeConnection(null);
      }).to.throw(AssertionError);
    });

    it('expect to not work when in invalid state', function (done) {
      mongoAdapter = new MongoAdapter();
      mongoAdapter.closeConnection()
        .catch(function (error) {
          expect(error).to.be.an.instanceOf(AssertionError);

          mongoAdapter = new MongoAdapter();
          mongoAdapter.database = function () {};
          mongoAdapter.closeConnection()
            .catch(function (error) {
              expect(error).to.be.an.instanceOf(AssertionError);

              mongoAdapter = new MongoAdapter();
              mongoAdapter.database = {};
              mongoAdapter.closeConnection()
                .catch(function (error) {
                  expect(error).to.be.an.instanceOf(AssertionError);
                  done();
                });
            });
        });
    });

    it('expect to resolve with valid state', function (done) {
      defaultAdapter.openConnection().then(function () {
        var promise = defaultAdapter.closeConnection();
        expect(promise).to.be.an.instanceOf(Promisse);
        promise.then(function (result) {
          expect(result).to.be.an('undefined');
          done();
        });
      });
    });

    it('expect to not close twice', function (done) {
      defaultAdapter.openConnection().then(function () {
        defaultAdapter.closeConnection().then(function () {
          defaultAdapter.closeConnection().catch(function (error) {
            expect(error).to.be.an.instanceOf(AssertionError);
            done();
          });
        });

        defaultAdapter.closeConnection()
          .then(function () {
            throw new Error();
          })
          .catch(function (error) {
            expect(error).to.be.an.instanceOf(AssertionError);
          });
      });
    });
  });
});
