'use strict';

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var expect = require('chai').expect;
var mongodb = require('mongodb');
var Promise = require('bluebird');
var Entity = require('@back4app/back4app-entity').models.Entity;

var MongoAdapter = require('../../../').MongoAdapter;
var QueryError = require('../../../').errors.QueryError;

// chai-as-promised setup
chai.use(chaiAsPromised);


describe('MongoAdapter', function () {
  var mongoAdapter;
  var db;

  before(function () {
    var url = 'mongodb://127.0.0.1:27017/test';

    // instantiate entity mongo adapter
    mongoAdapter = new MongoAdapter(url);

    // create connection to MongoDB
    return mongodb.MongoClient.connect(url)
      .then(function (database) {
        db = database;
      });
  });

  after(function () {
    return Promise.all([
      mongoAdapter.closeConnection(),
      db.close()
    ]);
  });

  describe('#getObject()', function () {
    // back4app Entities
    var User = Entity.specify({
      name: 'User',
      attributes: {
        name: {type: 'String'},
        age: {type: 'Number'},
        admin: {type: 'Boolean'}
      }
    });

    // back4app entity instances
    var john = new User({id: '0ca3c8c9-41a7-4967-a285-21f8cb4db2c0', name: 'John', age: 30, admin: true});
    var theo = new User({id: '5c2ca70f-d51a-4c97-a3ea-1668bde10fe7', name: 'Theo', age: 20, admin: false});
    var will = new User({id: 'd609db0b-b1f4-421a-a5f2-df8934ab023f', name: 'Will', age: 30, admin: false});

    // MongoDB documents
    var johnDoc = {_id: '0ca3c8c9-41a7-4967-a285-21f8cb4db2c0', name: 'John', age: 30, admin: true};
    var theoDoc = {_id: '5c2ca70f-d51a-4c97-a3ea-1668bde10fe7', name: 'Theo', age: 20, admin: false};
    var willDoc = {_id: 'd609db0b-b1f4-421a-a5f2-df8934ab023f', name: 'Will', age: 30, admin: false};

    beforeEach(function () {
      // populate test database
      return db.collection('User').insertMany([johnDoc, theoDoc, willDoc]);
    });

    afterEach(function () {
      // clear test database
      return db.dropDatabase();
    });

    it('should return a promise', function () {
      var result = mongoAdapter.getObject(User, {});
      expect(result).to.be.instanceOf(Promise);
      result.catch(function(){}); // ignore query errors, only testing type
    });

    it('should get object by id', function () {
      return expect(mongoAdapter.getObject(User, {id: '0ca3c8c9-41a7-4967-a285-21f8cb4db2c0'}))
        .to.become(john)
        .and.instanceOf(User);
    });

    it('should get object by custom property', function () {
      return expect(mongoAdapter.getObject(User, {name: 'Theo'}))
        .to.become(theo)
        .and.instanceOf(User);
    });

    it('should get object by multiple properties', function () {
      return expect(mongoAdapter.getObject(User, {age: 30, admin: false}))
        .to.become(will)
        .and.instanceOf(User);
    });

    it('should reject query with no result', function () {
      return expect(mongoAdapter.getObject(User, {name: 'Nobody'}))
        .to.eventually.be.rejectedWith(QueryError);
    });

    it('should reject query with multiple results', function () {
      return expect(mongoAdapter.getObject(User, {}))
        .to.eventually.be.rejectedWith(QueryError);
    });
  });
});
