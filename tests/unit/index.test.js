'use strict';

var expect = require('chai').expect;
var mongoose = require('mongoose');
var Entity =
  require('../../node_modules/@back4app/back4app-entity').models.Entity;

describe('index', function () {
  var db;

  before(function () {
    mongoose.connect('mongodb://localhost/test');
    db = mongoose.connection;
  });

  it('expect to connect with mongoose', function (done) {
    db.once('open', function () {
      done();
    });
  });

  it('expect to create new entity', function () {
    var Person = Entity.specify({
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

});

