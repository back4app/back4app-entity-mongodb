'use strict';

var expect = require('chai').expect;
var Entity = require('@back4app/back4app-entity').models.Entity;
var settings = require('@back4app/back4app-entity').settings;
var Adapter = require('../../');

describe('index', function () {

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

  it.skip('expect to connect, using mongoDB adapter',
    function (done) {
      var mongo = new Adapter();
      settings.ADAPTERS.default = mongo;
      Entity.specify({
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
      mongo.openConnection().then(function () {
        mongo.db.collection('restaurants')
          .insertOne(
          {
            'borough': 'Manhattan',
            'cuisine': 'Italian'
          },
          function (err) {
            expect(err).to.equal(null);
            done();
          }
        );
      });
    });
});
