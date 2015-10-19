'use strict';

var expect = require('chai').expect;
var mongo = require('../../');
var Entity =
  require('../../node_modules/@back4app/back4app-entity').models.Entity;

describe('index', function () {

  it('expect to create new schema', function (done) {
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
    mongo.registerEntity(Person).then(function (schema) {
      console.log(new schema({
        name: 'John'
      }));
      done();
    });
  });

});

