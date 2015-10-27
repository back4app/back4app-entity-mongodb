'use strict';

var expect = require('chai').expect;
var mongodb = require('mongodb');
var Promise = require('bluebird');
var uuid = require('node-uuid');
var Entity = require('@back4app/back4app-entity').models.Entity;

var MongoAdapter = require('../../..').MongoAdapter;


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

  describe('#get()', function () {
    // MongoDB documents
    var john = {_id: uuid.v4(), name: 'John', age: 30, admin: true};
    var theo = {_id: uuid.v4(), name: 'Theo', age: 20, admin: false};
    var will = {_id: uuid.v4(), name: 'Will', age: 15, admin: false};

    // back4app Entities
    var User = Entity.specify({
      name: 'User',
      attributes: {
        name: {type: 'String'},
        age: {type: 'Number'},
        admin: {type: 'Boolean'}
      }
    });

    beforeEach(function () {
      // populate test database
      return db.collection('User').insertMany([john, theo, will]);
    });

    afterEach(function () {
      // clear test database
      return db.dropDatabase();
    });

    it('should get user by id', function () {
      return mongoAdapter.getObject(User, {id: theo._id})
      //return db.collection('User').find({_id: theo._id}).next()
        .then(function (user) {
          //console.log(user);
          expect(user).to.deep.equal(theo);
        })
    });
  });
});
