'use strict';

var Promise = require('bluebird');
var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var classes = require('@back4app/back4app-entity').utils.classes;
var Adapter = require('@back4app/back4app-entity').adapters.Adapter;

module.exports = MongoAdapter;

/**
 * MongoDB adapter for back{4}app's entities.
 * @constructor
 * @memberof module:back4app-entity-mongodb
 * @extends {module:back4app-entity/adapters.Adapter}
 * @example
 * require('back4app-entity').settings.ADAPTERS = {
 *   default: new MongoAdapter('127.0.0.1', '51764')
 * };
 */
function MongoAdapter(connectionUrl, connectionOptions) {
  Adapter.call(this);

  /**
   * The connection url for MongoDB as specified in
   * {@link
   *https://mongodb.github.io/node-mongodb-native/api-generated/mongoclient.html
   * }.
   * @type {string}
   */
  this.connectionUrl = connectionUrl;
  /**
   * The optional connection parameter for MongoDB as specified in
   * {@link
   *https://mongodb.github.io/node-mongodb-native/api-generated/mongoclient.html
   * }.
   * @type {Object}
   */
  this.connectionOptions = connectionOptions;
  /**
   * The actual MongoDB database object. It is set after connecting to MongoDB.
   * @type {Object}
   */
  this.database = null;

  expect(arguments).to.have.length.below(
    3,
    'Invalid arguments length when creating a new MongoAdapter ' +
    '(it has to be passed less than 3 arguments)'
  );
}

classes.generalize(Adapter, MongoAdapter);

MongoAdapter.prototype.openConnection = openConnection;
MongoAdapter.prototype.closeConnection = closeConnection;
MongoAdapter.prototype.instanceToJSON = instanceToJSON;

/**
 * Connects the adapter with the targeted Mongo database.
 * @name module:back4app-entity-mongodb.MongoAdapter#openConnection
 * @function
 * @returns {Promise.<null|Error>} Promise that returns null if succeed and
 * the Error if failed.
 * @example
 * mongoAdapter.openConnection()
 *   .then(function () {
 *     console.log('success');
 *   })
 *   .catch(function (error) {
 *     console.log(error);
 *   });
 */
function openConnection() {
  var mongoAdapter = this;

  expect(arguments).to.have.length(
    0,
    'Invalid arguments length when opening a connection in a MongoAdapter ' +
    '(it has to be passed no arguments)'
  );

  expect(mongoAdapter.connectionUrl).to.be.a(
    'string',
    'Property "connectionUrl" has to be valid to open a connection in a ' +
    'MongoAdapter (it has to be a string)'
  );

  expect(mongoAdapter.connectionOptions).to.be.a(
    'object',
    'Property "connectionOptions" has to be valid to open a connection in a ' +
    'MongoAdapter (it has to be an object)'
  );

  return new Promise(function (resolve, reject) {
    MongoClient.connect(
      mongoAdapter.connectionUrl,
      mongoAdapter.connectionOptions,
      function (error, database) {
        if (error === null && mongoAdapter.database) {
          mongoAdapter.database = database;
          resolve();
        } else {
          reject(error);
        }
      }
    );
  });
}

/**
 * Closes the current adapter' connection with MongoDB.
 * @name module:back4app-entity-mongodb.MongoAdapter#closeConnection
 * @function
 * @returns {Promise.<Object|Error>} Promise that returns a result Object if
 * succeed and the Error if failed.
 * @example
 * mongoAdapter.closeConnection()
 *   .then(function (result) {
 *     console.log(result);
 *   })
 *   .catch(function (error) {
 *     console.log(error);
 *   });
 */
function closeConnection() {
  var mongoAdapter = this;

  if (mongoAdapter.db) {
    expect(mongoAdapter.db).to.be.an(
      'object',
      'Property "db" has to be an object to be closed.'
    );

    expect(mongoAdapter.db).to.respondTo(
      'close',
      'Property "db" has to be an object with a function called "close" ' +
      'to be closed.'
    );

    return new Promise(function (resolve, reject) {
      this.mongoAdapter.close(function (error, result) {
        if (error === null && result) {
          mongoAdapter.db = null;
          resolve(result);
        } else {
          reject(error);
        }
      });
    });
  }
}

//function instanceToJSON(instance) {
//  var json = {};
//  for (var key in instance.Entity.attributes) {
//    json[key] = instance[key];
//  }
//
//  if (instance.id) {
//    json._id = instance.id;
//  }
//
//  return json;
//}
