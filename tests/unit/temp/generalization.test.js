/**
 * Created by walkirya on 21/10/15.
 */

//tests generalization strategy with mongo driver

'use strict';

var expect = require('chai').expect;
var mongodb = require('mongodb');
var Entity = require('@back4app/back4app-entity').models.Entity;
var assert = require('assert');

describe('generalization save strategy', function () {
  var db;
  var Vehicle;
  var Car;
  var Bmw;
  var vehicleCollection;
  var carCollection;

  before(function (done) {
    
    var mongoclient = mongodb.MongoClient;
    mongoclient.connect("mongodb://localhost/test", function (err, _db) {
      console.log("Connected correctly to server");
      db = _db;
      vehicleCollection = db.collection('Vehicle');
      carCollection = db.collection('Car');
      done();
    });

  });// TODO: entity sav

  after(function () {
    db.close();
  });

  beforeEach(function () {
    vehicleCollection.drop();//clean collection
    carCollection.drop();//clean collection
  });

  it('expect to save subclass on its collection and its superclass collection ',
    function (done) {

      var car = new Car({
        id: '00000000-0000-4000-a000-000000000000',
        regPlate: 'bbb-0000', type: 'carro', ar: true
      });

      // TODO: entity save
      carCollection.insertOne({
        _id: '00000000-0000-4000-a000-000000000000',
        regPlate: 'bbb-0000', type: 'carro', ar: true
      }, function (err, result) {
        assert.equal(err, null);
        assert.equal(1, result.result.n);
        assert.equal(1, result.ops.length);
        console.log("Inserted 1 car into the car collection");


        vehicleCollection.insertOne({
            _id: '00000000-0000-4000-a000-000000000000',
            regPlate: 'bbb-0000', type: 'carro'
          },
          function (err, result) {
            assert.equal(err, null);
            assert.equal(1, result.result.n);
            assert.equal(1, result.ops.length);
            console.log("Inserted 1 car into the vehicle collection");

            carCollection.find({_id: '00000000-0000-4000-a000-000000000000'}).toArray(
              function (err, doc) {
                assert.equal(null, err);
                assert.equal('00000000-0000-4000-a000-000000000000', doc[0]._id);

                carCollection.find({}).toArray(function (err, items) {
                  assert.equal(null, err);
                  assert.equal(1, items.length);

                  vehicleCollection.find({_id: '00000000-0000-4000-a000-000000000000'}).toArray(
                    function (err, doc) {
                      assert.equal(null, err);
                      assert.equal('00000000-0000-4000-a000-000000000000', doc[0]._id);

                      vehicleCollection.find({}).toArray(function (err, items) {
                        assert.equal(null, err);
                        assert.equal(1, items.length);
                        done();
                      });
                    });
                });
              });
          });
      });
    });
});

describe('generalization delete strategy', function () {
  var db;
  var Vehicle;
  var Car;
  var Bmw;
  var vehicleCollection;
  var carCollection;
  var bmwCollection;

  before(function (done) {

    var mongoclient = mongodb.MongoClient;
    mongoclient.connect("mongodb://localhost/test", function (err, _db) {
      console.log("Connected correctly to server");
      db = _db;
      vehicleCollection = db.collection('Vehicle');
      carCollection = db.collection('Car');
      bmwCollection = db.collection('Bmw');
      done();
    });
  });

  after(function () {
    db.close();
  });

  beforeEach(function (done) {
    vehicleCollection.drop();//clean collection
    carCollection.drop();//clean collection
    bmwCollection.drop();

    //TODO: save
    bmwCollection
      .insertMany([
        {_id: '00000000-0000-4000-a000-000000000000',leatherSeat: true},
        {_id: '00000000-0000-4000-a000-000000000011',leatherSeat: true}])
      .then(function(r) {
        assert.equal(2, r.insertedCount);
      })
      .then (function () {
      return carCollection.insertMany([
        {_id: '00000000-0000-4000-a000-000000000000', ar: true},
        {_id: '00000000-0000-4000-a000-000000000011', ar: false}])
        .then(function(r) {
          assert.equal(2, r.insertedCount);
        })
      })
      .then (function () {
      return vehicleCollection.insertMany([
        {_id: '00000000-0000-4000-a000-000000000000', regPlate: 'bmw-0000', type: 'bmw'},
        {_id: '00000000-0000-4000-a000-000000000011', regPlate: 'bmw-0001', type: 'bmw'}])
        .then(function(r) {
          assert.equal(2, r.insertedCount);
        })
      })
      .then (function () {
        done();
      })
      .catch(function (err) {
        console.log(err);
      });
  });

  it('expect to delete bmw in bmwCollection, carCollection and vehicleCollection',
    function (done) {

      ////TODO: find and delete
      bmwCollection
        .findOneAndDelete({_id: '00000000-0000-4000-a000-000000000000'})
        .then(function(r) {
          assert.equal('00000000-0000-4000-a000-000000000000', r.value._id);
          assert.equal(1, r.lastErrorObject.n);
        })
        .then(function () {
          return bmwCollection.find({}).toArray();
        })
        .then (function (docs) {
          assert.equal(0, docs.length);
        })
        .then(function () {
          return carCollection
            .findOneAndDelete({_id: '00000000-0000-4000-a000-000000000000'})
        })
        .then(function(r) {
          assert.equal('00000000-0000-4000-a000-000000000000', r.value._id);
          assert.equal(1, r.lastErrorObject.n);
        })
        .then(function () {
          return carCollection.find({}).toArray();
        })
        .then (function (docs) {
          assert.equal(0, docs.length);
        })
        .then(function () {
          return vehicleCollection
            .findOneAndDelete({_id: '00000000-0000-4000-a000-000000000000'})
        })
        .then(function(r) {
          assert.equal('00000000-0000-4000-a000-000000000000', r.value._id);
          assert.equal(1, r.lastErrorObject.n);
        })
        .then(function () {
          return vehicleCollection.find({}).toArray();
        })
        .then (function (docs) {
        assert.equal(0, docs.length);
        })
        .then (function () {
          done();
        })
        .catch(function (err) {
          console.log(err);
        });

  });
});

describe.only('generalization update strategy', function () {
  var db;
  var vehicleCollection;
  var carCollection;
  var bmwCollection;

  before(function (done) {
    var mongoclient = mongodb.MongoClient;
    mongoclient.connect("mongodb://localhost/test", function (err, _db) {
      console.log("Connected correctly to server");
      db = _db;
      vehicleCollection = db.collection('Vehicle');
      carCollection = db.collection('Car');
      bmwCollection = db.collection('Bmw');
      done();
    });
  });

  beforeEach(function (done) {
    vehicleCollection.drop();//clean collection
    carCollection.drop();//clean collection
    bmwCollection.drop();

    //TODO: save
    bmwCollection
      .insertMany([
        {_id: '00000000-0000-4000-a000-000000000000',leatherSeat: true},
        {_id: '00000000-0000-4000-a000-000000000011',leatherSeat: true}])
        .then(function(r) {
          assert.equal(2, r.insertedCount);
        })
      .then (function () {
        return carCollection.insertMany([
          {_id: '00000000-0000-4000-a000-000000000000', ar: true},
          {_id: '00000000-0000-4000-a000-000000000011', ar: false}])
          .then(function(r) {
            assert.equal(2, r.insertedCount);
          })
      })
      .then (function () {
        return vehicleCollection.insertMany([
          {_id: '00000000-0000-4000-a000-000000000000', regPlate: 'bmw-0000', type: 'bmw'},
          {_id: '00000000-0000-4000-a000-000000000011', regPlate: 'bmw-0001', type: 'bmw'}])
          .then(function(r) {
            assert.equal(2, r.insertedCount);
          })
      })
      .then (function () {
        done();
      })
      .catch(function (err) {
        console.log(err);
      });
  });

  it.only('expect to find one vehicle and update', function (done) {
    vehicleCollection
      .findOneAndUpdate({"regPlate": "bmw-0001", "type": "bmw"},
        {$set: {regPlate: 'bmw-0002'}}, {returnOriginal: false})
      .then(function () {
        return vehicleCollection
          .find({_id: '00000000-0000-4000-a000-000000000011'}).toArray()
            .then(function(docs){
              assert.equal('bmw-0002', docs[0].regPlate);
          })
      })
      .then(function () {
        return carCollection
          .find({_id: '00000000-0000-4000-a000-000000000011'}).toArray()
          .then(function(docs){
            assert.equal(false, docs[0].ar);
          })
      })
      .then(function () {
        return bmwCollection
          .find({_id: '00000000-0000-4000-a000-000000000011'}).toArray()
          .then(function(docs){
            assert.equal(true, docs[0].leatherSeat);
          })
      })
      .then (function () {
        done();
      })
      .catch(function (err) {
        console.log(err);
      });
  });


  it('expect to find many and update it', function () {

  });

});
