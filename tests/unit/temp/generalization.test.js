/**
 * Created by walkirya on 21/10/15.
 */

//tests generalization strategy with mongo driver

'use strict';

var expect = require('chai').expect;
var mongodb = require('mongodb');
var Entity = require('@back4app/back4app-entity').models.Entity;
var assert = require('assert');

describe('generalization', function (){
  var db;
  var Vehicle;
  var Car;
  var Bmw;
  var vehicleCollection;

  before(function(done) {

    Vehicle = Entity.specify({name: 'vehicle', attributes:
    { placa: {type: 'String', multiplicity: '1', default: undefined},
      tipo: {type: 'String', multiplicity: '1', default: undefined} }});

    Car = Vehicle.specify({name: 'car', attributes:
    { ar: {type: 'String', multiplicity: '1', default: undefined}}});

    Bmw = Car.specify()

    var mongoclient = mongodb.MongoClient;
    mongoclient.connect("mongodb://localhost/test", function(err, _db) {
      console.log("Connected correctly to server");
      db = _db;
      vehicleCollection = db.collection('Vehicle');
      done();
    });

  });

  after(function () {
    db.close();
  });

  it('expect to save subclass on its collection and its superclass collection ',
    function (done) {

    var carCollection = db.collection('Car');
    carCollection.drop();//clean collection
    var c1 = new Car({id:'00000000-0000-4000-a000-000000000000',
      placa: 'bbb-0000', tipo: 'carro', ar: 'sim'});


    carCollection.insertOne(c1, function (err, result) {
      assert.equal(err, null);
      assert.equal(1, result.result.n);
      assert.equal(1, result.ops.length);
      console.log("Inserted 3 documents into the document collection");

      vehicleCollection.insertOne({id:'00000000-0000-4000-a000-000000000000',
        placa: 'bbb-0000', tipo: 'carro'},
        function (err, result) {
          assert.equal(err, null);
          assert.equal(1, result.result.n);
          assert.equal(1, result.ops.length);
          console.log("Inserted 3 documents into the document collection");
          done();

        vehicleCollection.find({id: '00000000-0000-4000-a000-000000000000'},
          function(err, doc) {
            assert.equal(null, err);
            assert.equal(null, doc.id);
            //assert.equal(2, doc.b);
          });

          vehicleCollection.find({}).toArray(function(err, items) {
            assert.equal(null, err);
            assert.equal(1, items.length);
            done();
          });
      });
    });
  });

  it('delete', function (done) {

  });

  it('delete', function (done) {

  });


});
