//
// Created by davimacedo on 22/10/15.
//

'use strict';

var chai = require('chai');
var expect = chai.expect;
var mongodb = require('mongodb');
var Promise = require('bluebird');

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

  function join(result, field, collection/*, options*/) {
    return new Promise(function (resolve) {
      var ids = [];
      var i;
      for (i in result) {
        var doc = result[i];
        for (var key in doc[field]) {
          var fieldObj = doc[field][key];
          //console.log(fieldObj);
          ids.push(fieldObj._id || fieldObj.id || fieldObj.oid);
        }
      }
      var refCollection = db.collection(collection);
      refCollection.find({_id: {$in: ids}}).toArray(function (err, docs) {
        var dict = {};
        for (i in docs) {
          dict[docs[i]._id] = docs[i];
        }

        for (i in result) {
          var doc = result[i];
          for (var key in doc[field]) {
            var fieldObj = doc[field][key];
            var id = fieldObj._id || fieldObj.id || fieldObj.oid;
            doc[field][key] = dict[id];
          }
        }

        resolve(result);
      });
    });
  }

  it('should save the foreign key as a DBRef',
    function (done) {
      db.collection('authors')
        .insertMany([{
          '_id': 'test',
          'name': 'Autor Um'
        }, {
          '_id': 'test2',
          'name': 'Autor Dois'
        }], function (err) {
          expect(err).to.be.a('null');
          db.collection('books')
            .insertMany([{
              '_id': 'book',
              'title': 'Livro de Dois Autores',
              'author': [{
                '$ref': 'authors',
                '$id': 'test'
              }, {
                '$ref': 'authors',
                '$id': 'test2'
              }]
            },{
              '_id': 'book2',
              'title': 'Livro de Um Autor',
              'author': [{
                '$ref': 'authors',
                '$id': 'test'
              }]
            }], function (err) {
              expect(err).to.be.a('null');

              db.collection('books').find()
                .toArray(function (err, doc) {
                  expect(err).to.be.a('null');
                  expect(doc[0]).to.have.property('_id');
                  expect(doc[0]).to.have.property('author');
                  expect(doc[0].author[0]).to.have.property('oid');
                  //console.log(doc[0]);
                  done();
                });
            });

        });
    });

  it('should join the collections', function (done) {
    db.collection('books').find()
      .toArray(function (err, doc) {
        join(doc, 'author', 'authors').then(function (result) {
          expect(result).to.not.be.an('undefined');
          expect(result[0].author[0]).to.not.have.property('oid');
          expect(result[0].author[0].name).to.equal('Autor Um');
          expect(result[0].author[1].name).to.equal('Autor Dois');
          //console.log(result[0],result[1]);
          db.close();
          done();
        });
      });

  });

});

