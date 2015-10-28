/**
 * Created by walkirya on 26/10/15.
 */

'use strict';

var chai = require('chai');
var expect = chai.expect;
var Promise = require('bluebird');
var mongodb = require('mongodb');
//var uuid = require('node-uuid');
var Entity = require('@back4app/back4app-entity').models.Entity;
var MongoAdapter = require('../../../').MongoAdapter;


describe('Delete method MongoAdapter', function () {
  var db;
  var mongoAdapter;

  before(function() {
    var url = 'mongodb://127.0.0.1:27017/test';

    // instantiate entity mongo adapter
    mongoAdapter = new MongoAdapter(url);

    // create connection to MongoDB
    return mongodb.MongoClient.connect('mongodb://localhost/test')
      .then(function (database) {
        db = database;
      });
  });

  after(function () {
    return Promise.all([ // equal to done()
      mongoAdapter.closeConnection(),
      db.close()
    ]);
  });

  describe.only('#delete()', function () {
    //back4app Entities
    var Vehicle = Entity.specify({
      name: 'Vehicle',
      attributes: {
        regPlate: {type: 'String'}
      }
    });

    var Car = Vehicle.specify({
      name: 'Car',
      attributes: {
        year: {type: 'String'}
      }
    });

    var Bmw = Car.specify({
      name: 'Bmw',
      attributes: {
        air: {type: 'Boolean'}
      }
    });

    var bmw = new Bmw({id: '00000000-0000-4000-a000-000000000111',
      regPlate: 'bbb-000', year: '2015', air: true});
    var audi = new Car({id: '00000000-0000-4000-a000-000000000222',
      regPlate: 'bbb-000', year: '2015'});

    //MongoDb documents
    var bmwV = {_id: '00000000-0000-4000-a000-000000000111', regPlate: 'bbb-000'};
    var bmwC = {_id: '00000000-0000-4000-a000-000000000111', year: '2015'};
    var bmwB = {_id: '00000000-0000-4000-a000-000000000111', air: true};

    var audiV = {_id: '00000000-0000-4000-a000-000000000222', regPlate: 'aaa-000'};
    var audiC = {_id: '00000000-0000-4000-a000-000000000222', year: '2014'};
    var audiB = {_id: '00000000-0000-4000-a000-000000000222', air: true};

    beforeEach(function () {
      //populate test database
      return Promise.all([
        db.collection('Vehicle').insertMany([bmwV, audiV]),
        db.collection('Car').insertMany([bmwC, audiC]),
        db.collection('Bmw').insertMany([bmwB, audiB])
      ]);
    });

    afterEach(function () {
      //clear test database
      return db.dropDatabase();
    });

    it('should delete bmw and all its generalizations', function () {
      return mongoAdapter.deleteObject(bmw)

        .then(function () {
          return db.collection('Bmw').find({_id: '00000000-0000-4000-a000-000000000111'}).toArray();
        })
        .then(function (docs) {
          expect(docs.length).to.equal(0);
        })
        .then(function () {
          return db.collection('Car').find({_id: '00000000-0000-4000-a000-000000000111'}).toArray();
        })
        .then(function (docs) {
          expect(docs.length).to.equal(0);
        })
        .then(function () {
          return db.collection('Vehicle').find({_id: '00000000-0000-4000-a000-000000000111'}).toArray();
        })
        .then(function (docs) {
          expect(docs.length).to.equal(0);
        });
    });

    it('should delete audi and all its specializations and generalizations', function () {
      return mongoAdapter.deleteObject(audi)

        .then(function () {
          return db.collection('Bmw').find({_id: '00000000-0000-4000-a000-000000000222'}).toArray();
        })
        .then(function (docs) {
          expect(docs.length).to.equal(0);
        })
        .then(function () {
          return db.collection('Car').find({_id: '00000000-0000-4000-a000-000000000222'}).toArray();
        })
        .then(function (docs) {
          expect(docs.length).to.equal(0);
        })
        .then(function () {
          return db.collection('Vehicle').find({_id: '00000000-0000-4000-a000-000000000222'}).toArray();
        })
        .then(function (docs) {
          expect(docs.length).to.equal(0);
        });
    });


  });

});
