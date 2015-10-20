'use strict';

var mongoose = require('mongoose');
var GenericAdapter = require('../../../node_modules/@back4app/back4app-entity')
  .adapters.databaseAdapter;
var Schema = require('./schema');

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
  mongo.entitySchema = null;

  mongo.registerEntity = registerEntity;
  mongo.getMongooseModel = getMongooseModel;

  /**
   * Registers the Entity Schema and returns the Model.
   * @name module:back4app/entity-mongodb/models/SchemaBuilder~registerEntity
   * @function
   * @param {!module:back4app/entity/models/Entity}
   * entity Entity instance containing properties that shall become
   * the Schema properties.
   * @returns {!Promise} Promise that creates the Schema and Model from
   * entity, and returns it to be used in chained functions.
   * @example
   * mongo.registerEntity(Person).then(function (Model) {
   *   var person = new Model({
   *     name: 'John'
   *   }));
   * });
   */
  function registerEntity(entity) {
    var promise = openConnection().then(function (db) {
      mongo.db = db;
      mongo.entitySchema = Schema.buildModel(entity);
      return mongo.entitySchema;
    }, function () {
      throw 'connection error';
    }).then(function () {
      closeConnection();
      return mongo.entitySchema;
    });
    return promise;
  }

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
      mongoose.connect(uri);
      var db = mongoose.connection;
      db.once('open', function () {
        resolve(db);
        return db;
      });
      db.on('error', function () {
        reject(db);
      });
    });
  }

  /**
   * Returns the Model registered with passed name.
   * @name module:back4app/entity-mongodb/models/SchemaBuilder~getMongooseModel
   * @function
   * @param {!module:back4app/entity/models/Entity}
   * entity Entity instance containing properties that shall become
   * the Schema properties.
   * @returns {!Promise} Promise that get the Model from database,
   * and returns it to be used in chained functions.
   * @example
   * adapter.getMongooseModel('Person').then(function (model) {
   *   expect(adapter.entitySchema).to.equal(model);
   * });
   */
  function getMongooseModel(name) {
    var promise = openConnection().then(function (db) {
      mongo.db = db;
      return mongoose.model(name);
    }, function () {
      throw 'connection error';
    }).then(function (model) {
      closeConnection();
      return model;
    });
    return promise;
  }

  /**
   * Closes the current connection.
   * @name module:back4app/entity-mongodb/models/SchemaBuilder~closeConnection
   * @function
   */
  function closeConnection() {
    mongoose.disconnect(function () {
      mongo.db = null;
    });
  }

  return mongo;
}
