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
    person.id = 'Johsadoifasiudfn';

    var mongo = new Adapter();

    expect(Person.methods.greeting.call(person), 'I am John');
  });

  it.skip('expect to connect, using mongoDB adapter',
    function (done) {
      var mongo = new Adapter();
      settings.ADAPTERS.default = mongo;
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
      mongo.openConnection().then(function () {
        mongo.db.collection('restaurants')
          .insertOne( {
            "borough" : "Manhattan",
            "cuisine" : "Italian"
          }, function(err, result) {
            expect(err).to.be.null;
            done()
          });
      });

    });

  //

  it.only('expect to connect, using mongoDB adapter',
    function (done) {
      var mongo = new Adapter();
      settings.ADAPTERS.default = mongo;
      mongo.openConnection().then(function () {
        //expect(mongo.db).to.be.null;
        mongo.db.collection('authors')
          .insertOne( {
            '_id': 'test3',
            'name': 'Ukrasad'
          }, function(err, result) {
            expect(err).to.be.null;

            mongo.db.collection('books')
              .insertOne( {
                '_id': 'book3',
                'title': 'Barubaru lululu',
                'author': {
                  '$ref': 'authors',
                  '$id': 'test'
                }
              }, function(err, result) {
                expect(err).to.be.null;

                mongo.db.collection('books').find( )
                  .toArray(function(err, doc) {
                    expect(err).to.be.null;
                    console.log(doc)
                  });

                done();

              });

          });

      });

    });

});
