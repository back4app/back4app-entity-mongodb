'use strict';

var expect = require('chai').expect;
var mongo = require('../../');

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

    mongo.registerEntity(person).then(function (schema) {
      console.log(new PersonModel({
        name: 'John'
      }));
      done();
    });
  });

});

