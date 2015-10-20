'use strict';

var expect = require('chai').expect;
var mongoose = require('mongoose');
var Entity = require('@back4app/back4app-entity').models.Entity;
var Schema = require('../../src/back/models/schema');
var mongo = require('../../');

describe('index', function () {
  var db;

  before(function () {
    mongoose.connect('mongodb://localhost/test');
    db = mongoose.connection;
  });

  after(function () {
    mongoose.disconnect();
  });

  it('expect to connect with mongoose', function (done) {
    db.once('open', function () {
      done();
    });
  });

  it('expect to create new entity', function () {
    var Person = Entity.specify({
      name: 'Person',
      attributes: {
        name: {
          type: 'String',
          multiplicity: '1',
          default: undefined
        }
      },
      methods: {
        greeting: function greeting() {
          return 'I am ' + this.name;
        }
      }
    });

    var person = new Person();
    person.name = 'John';
    expect(Person.methods.greeting.call(person), 'I am John');
  });

  it.skip('expect to create new schema', function () {
    var Person = Entity.specify({
      name: 'Person',
      attributes: {
        name: {
          type: 'String',
          multiplicity: '1',
          default: undefined
        }
      },
      methods: {
        greeting: function greeting() {
          return 'I am ' + this.name;
        }
      }
    });

    var PersonModel = Schema.buildModel(Person);

    console.log(new PersonModel({
      name: 'John'
    }));
  });

  it.skip('expect to create new schema, using mongoDB adapter',
    function (done) {
      var Person = Entity.specify({
        name: 'Person',
        attributes: {
          name: {
            type: 'String',
            multiplicity: '1',
            default: ''
          }
        },
        methods: {
          greeting: function greeting() {
            return 'I am ' + this.name;
          }
        }
      });
      mongo.registerEntity(Person).then(function (Model) {
        expect(new Model({
          name: 'John'
        })).to.have.property('_id');
        done();
      });
    });

});
