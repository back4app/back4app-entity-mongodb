'use strict';

var mongoose = require('mongoose');
var GenericAdapter = require('../../node_modules/@back4app/back4app-entity').adapters.databaseAdapter;
var Schema = require('../../src/back/models/schema');

module.exports = new MongoAdapter();

function MongoAdapter() {
  var mongo = new GenericAdapter();

  mongo.db = null;
  mongo.entitySchema = null;

  mongo.registerEntity = registerEntity;

  function registerEntity(entity) {
    var promise = openConnection().then(function (db) {
      mongo.db = db;
      mongo.entitySchema = Schema.buildModel(entity);
    }, function (db) {
      console.log('error error error');
    }).then(function() {
      closeConnection();
      return mongo.entitySchema;
    });
    return promise;
  }

  function openConnection(){
    return new Promise(function(resolve, reject) {
      mongoose.connect('mongodb://localhost/test');
      var db = mongoose.connection;
      db.on('open', function() {
        resolve(db);
      });
      db.on('error', function() {
        reject(db);
      });
    });
  }

  function closeConnection(){
    mongo.db.disconnect(function() {
      mongo.db = null;
    });
  }

  return mongo;
}
