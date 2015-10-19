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
  mongo.getMongooseModel = getMongooseModel;

  function registerEntity(entity) {
    var promise = openConnection().then(function (db) {
      mongo.db = db;
      mongo.entitySchema = Schema.buildModel(entity);
      return mongo.entitySchema;
    }, function (db) {
      throw 'connection error';
      return db;
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
      db.once('open', function(callback) {
        resolve(db);
        return db;
      });
      db.on('error', function() {
        reject(db);
      });

    });
  }

  function getMongooseModel(name) {
    var promise = openConnection().then(function (db) {
      mongo.db = db;
      return mongoose.model(name);
    }, function (db) {
      throw 'connection error';
      return db;
    }).then(function(model) {
      closeConnection();
      return model;
    });
    return promise;
  }

  function closeConnection(){
    mongoose.disconnect(function() {
      mongo.db = null;
    });
  }

  return mongo;
}
