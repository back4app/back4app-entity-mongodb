'use strict';

var chai = require('chai');
var expect = chai.expect;
var AssertionError = chai.AssertionError;
var Promise = require('bluebird');
var mongodb = require('mongodb');

var Entity = require('@back4app/back4app-entity').models.Entity;
var MongoAdapter = require('../../../').MongoAdapter;


describe('Delete method MongoAdapter', function () {
  var db;
  var mongoAdapter;

  before(function () {
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
    return Promise.all([
      mongoAdapter.closeConnection(),
      db.close()
    ]);
  });

  describe('#delete()', function () {
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
        year: {type: 'String'},
        wheels: {type: 'Wheel'}
      }
    });

    var Bmw = Car.specify({
      name: 'Bmw',
      attributes: {
        air: {type: 'Boolean'}
      }
    });

    var Wheel = Entity.specify({
      name: 'Wheel',
      attributes: {
        tyre: {type: 'Number'}
      }
    });

    var bmw = new Bmw({
      id: '00000000-0000-4000-a000-000000000111',
      regPlate: 'bbb-000',
      year: '2015',
      air: true
    });
    var vehicle = new Vehicle({
      id: '00000000-0000-4000-a000-000000000222',
      regPlate: 'bbb-000'
    });
    var wheel1 = new Wheel({
      id: '00000000-0000-4000-a000-000000000333',
      tyre: 17
    });
    var wheel2 = new Wheel({
      id: '00000000-0000-4000-a000-000000000444',
      tyre: 17
    });
    var wheel3 = new Wheel({
      id: '00000000-0000-4000-a000-000000000555',
      tyre: 17
    });
    var wheel4 = new Wheel({
      id: '00000000-0000-4000-a000-000000000666',
      tyre: 17
    });
    var car = new Car({
      id: '00000000-0000-4000-a000-000000000777',
      regPlate: 'ccc-000', year: '2015',
      wheels: [wheel1, wheel2, wheel3, wheel4]
    });

    //MongoDb documents
    var bmwD = {
      _id: '00000000-0000-4000-a000-000000000111',
      Entity: 'Bmw',
      regPlate: 'bbb-000',
      year: '2015',
      air: true
    };
    var vehicleD = {
      _id: '00000000-0000-4000-a000-000000000222',
      Entity:'Vehicle',
      regPlate: 'aaa-000'
    };
    var wheel1D = {
      _id: '00000000-0000-4000-a000-000000000333', Entity: 'Wheel', tyre: 17
    };
    var wheel2D = {
      _id: '00000000-0000-4000-a000-000000000444', Entity: 'Wheel', tyre: 17
    };
    var wheel3D = {
      _id: '00000000-0000-4000-a000-000000000555', Entity: 'Wheel', tyre: 17
    };
    var wheel4D = {
      _id: '00000000-0000-4000-a000-000000000666', Entity: 'Wheel', tyre: 17
    };
    var carD = {
      _id: '00000000-0000-4000-a000-000000000777',
      Entity: 'Car',
      regPlate: 'ccc-000',
      year: '2015',
      wheels: [{
        id: '00000000-0000-4000-a000-000000000333', Entity: 'Wheel'},
        {id: '00000000-0000-4000-a000-000000000444', Entity: 'Wheel'},
        {id: '00000000-0000-4000-a000-000000000555', Entity: 'Wheel'},
        {id: '00000000-0000-4000-a000-000000000666', Entity: 'Wheel'}
      ]
    };

    beforeEach(function () {
      //populate test database
      return Promise.all([
        db.collection('Wheel').insertMany([wheel1D, wheel2D, wheel3D, wheel4D]),
        db.collection('Vehicle').insertMany([bmwD, vehicleD, carD])
      ]);
    });

    afterEach(function () {
      //clear test database
      return db.dropDatabase();
    });

    it('expect to return a promise', function () {
      var result = mongoAdapter.deleteObject({});
      expect(result).to.be.instanceOf(Promise);
      result.catch(function () {}); // ignore query errors, only testing type
    });

    it('expect to not work with wrong arguments', function () {
      expect(function () {
        mongoAdapter.deleteObject();
      }).to.throw(AssertionError);

      mongoAdapter
        .deleteObject({})
        .catch(function (error) {
          expect(error).to.be.an.instanceOf(AssertionError);
        });

      expect(function () {
        mongoAdapter.deleteObject(vehicle, null);
      }).to.throw(AssertionError);
    });

    it('expect to delete a single class', function () {
      return mongoAdapter.deleteObject(vehicle)
        .then(function () {
          return db.collection('Vehicle')
            .find({_id: '00000000-0000-4000-a000-000000000222'}).toArray();
        })
        .then(function (docs) {
          expect(docs.length).to.equal(0);
        });
    });

    it('expect to delete a class that has General(s)', function () {
      return mongoAdapter.deleteObject(bmw)
        .then(function () {
          return db.collection('Vehicle')
            .find({_id: '00000000-0000-4000-a000-000000000111'}).toArray();
        })
        .then(function (docs) {
          expect(docs.length).to.equal(0);
        });
    });

    it('expect to delete a class that has foreign key', function () {
      return mongoAdapter.deleteObject(car)
        .then(function () {
          return db.collection('Vehicle')
            .find({_id: '00000000-0000-4000-a000-000000000777'}).toArray();
        })
        .then(function (docs) {
          expect(docs.length).to.equal(0);
        })
        .then(function () {
          return db.collection('Wheel')
            .find({_id: '00000000-0000-4000-a000-000000000333'}).toArray();
        })
        .then(function (docs) {
          expect(docs.length).to.equal(1);
        })
        .then(function () {
          return db.collection('Wheel')
            .find({_id: '00000000-0000-4000-a000-000000000444'}).toArray();
        })
        .then(function (docs) {
          expect(docs.length).to.equal(1);
        })
        .then(function () {
          return db.collection('Wheel')
            .find({_id: '00000000-0000-4000-a000-000000000555'}).toArray();
        })
        .then(function (docs) {
          expect(docs.length).to.equal(1);
        })
        .then(function () {
          return db.collection('Wheel')
            .find({_id: '00000000-0000-4000-a000-000000000666'}).toArray();
        })
        .then(function (docs) {
          expect(docs.length).to.equal(1);
        });
    });

    it('expect to delete a class that is a foreign key to another class',
      function () {
        return mongoAdapter.deleteObject(wheel1)
          .then(function () {
            return db.collection('Wheel')
              .find({_id: '00000000-0000-4000-a000-000000000333'}).toArray();
          })
          .then(function (docs) {
            expect(docs.length).to.equal(0);
          })
          .then(function () {
            return db.collection('Wheel')
              .find({_id: '00000000-0000-4000-a000-000000000444'}).toArray();
          })
          .then(function (docs) {
            expect(docs.length).to.equal(1);
          })
          .then(function () {
            return db.collection('Wheel')
              .find({_id: '00000000-0000-4000-a000-000000000555'}).toArray();
          })
          .then(function (docs) {
            expect(docs.length).to.equal(1);
          })
          .then(function () {
            return db.collection('Wheel')
              .find({_id: '00000000-0000-4000-a000-000000000666'}).toArray();
          })
          .then(function (docs) {
            expect(docs.length).to.equal(1);
          })
          .then(function () {
            return db.collection('Vehicle')
              .find({_id: '00000000-0000-4000-a000-000000000777'}).toArray();
          })
          .then(function (docs) {
            expect(docs.length).to.equal(1);
          });
      });
  });
});
