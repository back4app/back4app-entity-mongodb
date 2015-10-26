//
// Created by davimacedo on 22/10/15.
//

'use strict';

var chai = require('chai');
var expect = chai.expect;
var mongodb = require('mongodb');
var MJ = require('mongo-fast-join'),
  mongoJoin = new MJ();

/*var AssertionError = chai.AssertionError;
 var Promisse = require('bluebird');
 var entity = require('@back4app/back4app-entity');
 var settings = entity.settings;
 var classes = entity.utils.classes;
 var Adapter = entity.adapters.Adapter;
 var MongoAdapter = require('../../../').MongoAdapter;*/

require('../settings');

//var defaultAdapter = settings.ADAPTERS.default;

describe.only('foreign key strategy', function () {
  var db;

  before(function (done) {
    var mongoclient = mongodb.MongoClient;
    mongoclient.connect('mongodb://localhost/test', function (err, _db) {
      console.log('Connected correctly to server');
      db = _db;
      db.collection('authors').drop();
      db.collection('books').drop();
      done();
    });
  });

  after(function () {
    db.close();
  });

  it('should save the foreign key as a DBRef',
    function (done) {
      db.collection('authors')
        .insertMany( [{
          '_id': 'test',
          'name': 'Ukrasad'
        }, {
          '_id': 'test2',
          'name': 'Dasarku'
        }], function(err, result) {
          expect(err).to.be.null;
          db.collection('books')
            .insertOne( {
              '_id': 'book',
              'title': 'Barubaru lululu',
              'author': [{
                '$ref': 'authors',
                '$id': 'test'
              }, {
                '$ref': 'authors',
                '$id': 'test2'
              }]
            }, function(err, result) {
              expect(err).to.be.null;

              db.collection('books').find( )
                .toArray(function(err, doc) {
                  expect(err).to.be.null;
                  expect(doc[0]).to.have.property('_id');
                  expect(doc[0]).to.have.property('author');
                  expect(doc[0].author[0]).to.have.property('oid');
                  console.log(doc[0]);
                  done();
                });
            });

        });
    });

  it('should join the ', function(done) {
    mongoJoin.query(db.collection('books'),
      {}, //query statement
      {}, //fields
      {} //options
    ).join({
        joinCollection: db.collection('authors'),
        leftKeys: ['author.oid'],
        rightKeys: ['_id'],
        newKey: 'author'
      }).exec(function(er, doc) {
        /*delete doc[0]['author'];
         doc[0]['authors'] = doc[0]['author_joined'];
         delete doc[0]['author_joined'];*///used to clean the refs
        doc[0].author = doc[0].author
          .splice(doc[0].author.length/2);//new way to clean refs
        expect(er).to.be.undefined;
        expect(doc).to.not.be.undefined;
        expect(doc[0].author[0]).to.not.have.property('oid');
        expect(doc[0].author[0].name).to.equal('Ukrasad');
        db.close();
        done();
      });
  });

});

