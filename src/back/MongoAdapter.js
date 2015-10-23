'use strict';

var expect = require('chai').expect;
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
//MongoAdapter.prototype.instanceToJSON = instanceToJSON;

/**
 * Connects the adapter with the targeted Mongo database.
 * @name module:back4app-entity-mongodb.MongoAdapter#openConnection
 * @function
 * @returns {Promise.<undefined|Error>} Promise that returns nothing if succeed
 * and the Error if failed.
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

  return new Promise(function (resolve, reject) {
    expect(mongoAdapter.database).to.equal(
      null,
      'The connection is already opened'
    );

    expect(mongoAdapter.connectionUrl).to.be.a(
      'string',
      'Property "connectionUrl" has to be valid to open a connection in a ' +
      'MongoAdapter (it has to be a string)'
    );

    if (mongoAdapter.connectionOptions) {
      expect(mongoAdapter.connectionOptions).to.be.a(
        'object',
        'Property "connectionOptions" has to be valid to open a connection ' +
        'in a MongoAdapter (it has to be an object)'
      );
    }

    mongoAdapter.database = {};

    try {
      MongoClient.connect(
        mongoAdapter.connectionUrl,
        mongoAdapter.connectionOptions,
        function (error, database) {
          if (error === null && database) {
            mongoAdapter.database = database;
            resolve();
          } else {
            mongoAdapter.database = null;
            reject(error);
          }
        }
      );
    } catch (e) {
      mongoAdapter.database = null;
      throw e;
    }
  });
}

/**
 * Closes the current adapter' connection with MongoDB.
 * @name module:back4app-entity-mongodb.MongoAdapter#closeConnection
 * @function
 * @returns {Promise.<undefined|Error>} Promise that returns nothing if
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

  expect(arguments).to.have.length(
    0,
    'Invalid arguments length when closing a connection in a MongoAdapter ' +
    '(it has to be passed no arguments)'
  );

  return new Promise(function (resolve, reject) {
    expect(mongoAdapter.database).to.not.equal(
      null,
      'The connection is already closed'
    );

    expect(mongoAdapter.database).to.be.an(
      'object',
      'Property "database" has to be an object to be closed.'
    );

    expect(mongoAdapter.database).to.respondTo(
      'close',
      'Property "database" has to be an object with a function called ' +
      '"close" to be closed.'
    );

    var database = mongoAdapter.database;
    mongoAdapter.database = null;

    try {
      database.close(function (error) {
        if (error === null) {
          resolve();
        } else {
          mongoAdapter.database = database;
          reject(error);
        }
      });
    } catch (e) {
      mongoAdapter.database = database;
      throw e;
    }
  });
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
