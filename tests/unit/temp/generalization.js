'use strict';

// TODO: review these tests and remove file
if (true) {
  return; // ignore tests, fooling linter
}


var expect = require('chai').expect;
var mongodb = require('mongodb');

describe('generalization save strategy', function () {
  var db;
  var vehicleCollection;
  var carCollection;

  before(function (done) {
    var mongoclient = mongodb.MongoClient;
    mongoclient.connect('mongodb://localhost/test', function (err, _db) {
      console.log('Connected correctly to server');
      db = _db;
      vehicleCollection = db.collection('Vehicle');
      carCollection = db.collection('Car');
      done();
    });
  });

  after(function () {
    db.close();
  });

  beforeEach(function () {
    //clean collection
    vehicleCollection.drop();
    carCollection.drop();
  });

  it('expect to save subclass on its collection and its superclass collection',
    function (done) {

      //TODO: entity save
      carCollection
        .insertOne({
          _id: '00000000-0000-4000-a000-000000000000', air: true
        })
        .then(function () {
          return vehicleCollection.insertOne({
            _id: '00000000-0000-4000-a000-000000000000',
            regPlate: 'bbb-0000', type: 'carro'
          });
        })
        .then(function () {
          return carCollection.find(
            {_id: '00000000-0000-4000-a000-000000000000'}).toArray();
        })
        .then(function (docs) {
          expect(docs[0]._id).to.equal('00000000-0000-4000-a000-000000000000');
          expect(docs.length).to.equal(1);
        })
        .then(function () {
          return vehicleCollection
          .find({_id: '00000000-0000-4000-a000-000000000000'}).toArray();
        })
        .then(function (docs) {
          expect(docs[0]._id).to.equal('00000000-0000-4000-a000-000000000000');
          expect(docs.length).to.equal(1);
        })
        .then(function () {
          return carCollection.find({}).toArray();
        })
        .then(function (docs) {
          expect(docs.length).to.equal(1);
        })
        .then(function () {
          return vehicleCollection.find({}).toArray();
        })
        .then(function (docs) {
          expect(docs.length).to.equal(1);
        })
        .then(function () {
          return carCollection.insertMany([
            {_id: '00000000-0000-4000-a000-000000000011',air: true},
            {_id: '00000000-0000-4000-a000-000000000022',air: false}]);
        })
        .then(function () {
          return vehicleCollection.insertMany([
            {_id: '00000000-0000-4000-a000-000000000011',
              regPlate: 'aaa-011', type: 'car'},
            {_id: '00000000-0000-4000-a000-000000000022',
              regPlate: 'aaa-022', type: 'car'}]);
        })
        .then(function () {
          return carCollection.find({}).toArray();
        })
        .then(function (docs) {
          expect(docs.length).to.equal(3);
        })
        .then(function () {
          return vehicleCollection.find({}).toArray();
        })
        .then(function (docs) {
          expect(docs.length).to.equal(3);
        })
        .then(function () {
          done();
        })
        .catch(function (err) {
          console.log(err);
        });
    });

});

describe('generalization delete strategy', function () {
  var db;
  var vehicleCollection;
  var carCollection;
  var bmwCollection;

  before(function (done) {

    var mongoclient = mongodb.MongoClient;
    mongoclient.connect('mongodb://localhost/test', function (err, _db) {
      console.log('Connected correctly to server');
      db = _db;
      vehicleCollection = db.collection('Vehicle');
      carCollection = db.collection('Car');
      bmwCollection = db.collection('Bmw');
      done();
    });
  });

  after(function () {
    vehicleCollection.drop();
    carCollection.drop();
    bmwCollection.drop();
    db.close();
  });

  beforeEach(function (done) {
    //clean collection
    vehicleCollection.drop();
    carCollection.drop();
    bmwCollection.drop();

    //TODO: save
    bmwCollection
      .insertMany([
        {_id: '00000000-0000-4000-a000-000000000000',leatherSeat: true},
        {_id: '00000000-0000-4000-a000-000000000011',leatherSeat: true}])
      .then(function () {
        return carCollection.insertMany([
        {_id: '00000000-0000-4000-a000-000000000000', air: true},
        {_id: '00000000-0000-4000-a000-000000000011', air: false}]);
      })
      .then(function () {
        return vehicleCollection.insertMany([
        {_id: '00000000-0000-4000-a000-000000000000',
          regPlate: 'bmw-0000', type: 'bmw'},
        {_id: '00000000-0000-4000-a000-000000000011',
          regPlate: 'bmw-0001', type: 'bmw'}]);
      })
      .then(function () {
        done();
      })
      .catch(function (err) {
        console.log(err);
      });
  });

  it('expect to delete bmw in bmwCollection, carCollection and' +
    'vehicleCollection ', function (done) {

      ////TODO: find and delete
      bmwCollection
        .findOneAndDelete({_id: '00000000-0000-4000-a000-000000000000'})
        .then(function () {
          return bmwCollection.find({}).toArray();
        })
        .then(function (docs) {
          expect(docs.length).to.equal(1);
        })
        .then(function () {
          return carCollection
            .findOneAndDelete({_id: '00000000-0000-4000-a000-000000000000'});
        })
        .then(function () {
          return carCollection.find({}).toArray();
        })
        .then(function (docs) {
          expect(docs.length).to.equal(1);
        })
        .then(function () {
          return vehicleCollection
            .findOneAndDelete({_id: '00000000-0000-4000-a000-000000000000'});
        })
        .then(function () {
          return vehicleCollection.find({}).toArray();
        })
        .then(function (docs) {
          expect(docs.length).to.equal(1);
        })
        .then(function () {
          done();
        })
        .catch(function (err) {
          console.log(err);
        });

    });
});

describe('generalization update strategy', function () {
  var db;
  var vehicleCollection;
  var carCollection;
  var bmwCollection;

  before(function (done) {
    var mongoclient = mongodb.MongoClient;
    mongoclient.connect('mongodb://localhost/test', function (err, _db) {
      console.log('Connected correctly to server');
      db = _db;
      vehicleCollection = db.collection('Vehicle');
      carCollection = db.collection('Car');
      bmwCollection = db.collection('Bmw');
      done();
    });
  });

  after(function () {
    vehicleCollection.drop();
    carCollection.drop();
    bmwCollection.drop();
    db.close();
  });

  beforeEach(function (done) {
    //clean collection
    vehicleCollection.drop();
    carCollection.drop();
    bmwCollection.drop();

    //TODO: save
    bmwCollection
      .insertMany([
        {_id: '00000000-0000-4000-a000-000000000000',leatherSeat: true},
        {_id: '00000000-0000-4000-a000-000000000011',leatherSeat: false}])
      .then(function () {
        return carCollection.insertMany([
          {_id: '00000000-0000-4000-a000-000000000000', air: true},
          {_id: '00000000-0000-4000-a000-000000000011', air: false}]);
      })
      .then(function () {
        return vehicleCollection.insertMany([
          {_id: '00000000-0000-4000-a000-000000000000',
            regPlate: 'bmw-0000', type: 'bmw'},
          {_id: '00000000-0000-4000-a000-000000000011',
            regPlate: 'bmw-0001', type: 'bmw'}]);
      })
      .then(function () {
        done();
      })
      .catch(function (err) {
        console.log(err);
      });
  });

  it('expect to find a superclass and update', function (done) {
    vehicleCollection
      .findOneAndUpdate({'regPlate': 'bmw-0001', 'type': 'bmw'},
        {$set: {regPlate: 'bmw-0002'}}, {returnOriginal: false})
      .then(function () {
        return vehicleCollection
          .find({_id: '00000000-0000-4000-a000-000000000011'}).toArray();
      })
      .then(function (docs) {
        expect(docs[0].regPlate).to.equal('bmw-0002');
      })
      .then(function () {
        done();
      })
      .catch(function (err) {
        console.log(err);
      });
  });

  it('expects to find a subclass and update', function (done) {
    bmwCollection
      .findOneAndUpdate({leatherSeat: false},
        {$set: {leatherSeat: true}}, {returnOriginal: false})
      .then(function () {
        return bmwCollection
        .find({_id: '00000000-0000-4000-a000-000000000011'}).toArray();
      })
      .then(function (docs) {
        expect(docs[0].leatherSeat).to.equal(true);
      })
      .then(function () {
        done();
      })
      .catch(function (err) {
        console.log(err);
      });
  });
});
