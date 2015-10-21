'use strict';

var mongodb = require('mongodb');
var MongoClient = require('mongodb').MongoClient;
var GenericAdapter = require('@back4app/back4app-entity').Adapter;

module.exports = MongoAdapter;

/**
 * Adapter for MongoDB, extended from entity project Adapter.
 * @constructor
 * @memberof module:back4app/entity-mongodb/models
 * @example
 * module.exports = MongoAdapter;
 */
function MongoAdapter(host, port) {
  var mongo = new GenericAdapter();
  mongo.config = {};
  mongo.config.host = host;
  mongo.config.port = port;

  mongo.db = null;

  mongo.openConnection = openConnection;
  mongo.closeConnection = closeConnection;

  /**
   * Connects the mongoose with the targeted Mongo database.
   * @name module:back4app/entity-mongodb/models/SchemaBuilder~openConnection
   * @function
   * @param {!module:back4app/entity/models/Entity}
   * entity Entity instance containing properties that shall become
   * the Schema properties.
   * @returns {!Promise} Promise that connects the mongoose to mongo database,
   * and returns it to be used in chained functions.
   * @example
   * var promise = openConnection().then(function (db) {
   *   mongo.db = db;
   *   mongo.entitySchema = Schema.buildModel(entity);
   *   return mongo.entitySchema;
   * }, function () {
   *   throw 'connection error';
   * });
   */
  function openConnection() {
    return new Promise(function (resolve, reject) {
      var uri = 'mongodb://';
      uri += mongo.config.host || 'localhost';
      uri += mongo.config.port ? ':' + mongo.config.port : '';
      uri += '/test';
      MongoClient.connect(uri, function(err, db) {
        if (err) {
          reject(db);
          return null;
        }
        mongo.db = db;
        resolve(db);
        return db;
      });
    });
  }

  /**
   * Closes the current connection.
   * @name module:back4app/entity-mongodb/models/SchemaBuilder~closeConnection
   * @function
   */
  function closeConnection() {
    mongo.db.close();
    mongo.db = null;
  }

  return mongo;
}
