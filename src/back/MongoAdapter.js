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
 * @param {!string} connectionUrl The connection url for MongoDB as specified in
 * {@link
 * https://mongodb.github.io/node-mongodb-native/api-generated/mongoclient.html
 * }.
 * @param {?Object} [connectionOptions] The optional connection parameter for
 * MongoDB as specified in
 * {@link
 * https://mongodb.github.io/node-mongodb-native/api-generated/mongoclient.html
 * }.
 * @example
 * require('back4app-entity').settings.ADAPTERS = {
 *   default: new MongoAdapter('127.0.0.1', '51764')
 * };
 */
function MongoAdapter(connectionUrl, connectionOptions) {
  Adapter.call(this);

  expect(arguments).to.have.length.below(
    3,
    'Invalid arguments length when creating a new MongoAdapter ' +
    '(it has to be passed less than 3 arguments)'
  );

  expect(connectionUrl).to.be.a(
    'string',
    'Invalid argument "connectionUrl" when creating a new MongoAdapter  (it ' +
    'has to be a string)'
  );

  if (connectionOptions) {
    expect(connectionOptions).to.be.a(
      'object',
      'Invalid argument "connectionOptions" when creating a new MongoAdapter ' +
      '(it has to be an object)'
    );
  } else {
    connectionOptions = null;
  }

  var _database = null;
  var _databasePromiseQueue = [];
  var _isConnecting = false;

  this.getDatabase = getDatabase;
  this.openConnection = openConnection;
  this.closeConnection = closeConnection;

  function getDatabase() {
    var mongoAdapter = this;

    return new Promise(function (resolve, reject) {
      if (_database) {
        resolve(_database);
      } else {
        _databasePromiseQueue.push({
          resolve: resolve,
          reject: reject
        });

        mongoAdapter.openConnection();
      }
    });
  }

  /**
   * Connects the adapter with the targeted Mongo database.
   * @name module:back4app-entity-mongodb.MongoAdapter#openConnection
   * @function
   * @returns {Promise.<undefined|Error>} Promise that returns nothing if
   * succeed and the Error if failed.
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
      if (_database) {
        resolve();
      } else if (_isConnecting) {
        _databasePromiseQueue.push({
          resolve: function () {
            resolve();
          },
          reject: reject
        });
      } else {
        _isConnecting = true;

        try {
          MongoClient.connect(
            mongoAdapter.connectionUrl,
            mongoAdapter.connectionOptions,
            function (error, database) {
              _isConnecting = false;

              if (error === null && database) {
                _database = database;
                resolve();
                _processPromiseQueue(
                  _databasePromiseQueue,
                  'resolve',
                  database
                );
              } else {
                if (database) {
                  database.close(function () {
                    reject(error);
                    _processPromiseQueue(
                      _databasePromiseQueue,
                      'reject',
                      error
                    );
                  });
                } else {
                  reject(error);
                  _processPromiseQueue(
                    _databasePromiseQueue,
                    'reject',
                    error
                  );
                }
              }
            }
          );
        } catch (e) {
          _isConnecting = false;
          throw e;
        }
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
    expect(arguments).to.have.length(
      0,
      'Invalid arguments length when closing a connection in a MongoAdapter ' +
      '(it has to be passed no arguments)'
    );

    return new Promise(function (resolve, reject) {
      if (_isConnecting) {
        _databasePromiseQueue.push({
          resolve: function (database) {
            database.close(function (error) {
              if (error === null) {
                _database = null;
                resolve();
              } else {
                reject(error);
              }
            });
          },
          reject: reject
        });
      } else if (!_database) {
        resolve();
      } else {
        _database.close(function (error) {
          if (error === null) {
            _database = null;
            resolve();
          } else {
            reject(error);
          }
        });
      }
    });
  }

  function _processPromiseQueue(queue, func, arg) {
    while (queue.length > 0) {
      queue.splice(0,1)[func](arg);
    }
  }
}

classes.generalize(Adapter, MongoAdapter);

MongoAdapter.prototype.loadAttribute = loadAttribute;
MongoAdapter.prototype.insertObject = insertObject;
//MongoAdapter.prototype.instanceToJSON = instanceToJSON;

function loadAttribute(Entity, attribute) {
  var dataName = attribute.getDataName(Entity.adapterName);

  expect(dataName).to.not.match(
    /^\$/,
    'The dataName of an Attribute cannot start with "$" in a MongoAdapter'
  );

  expect(dataName).to.not.contain(
    '.',
    'The dataName of an Attribute cannot contain "." in a MongoAdapter'
  );
}

function insertObject() {}

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
