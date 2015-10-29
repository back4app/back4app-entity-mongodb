'use strict';

var expect = require('chai').expect;
var Promise = require('bluebird');
var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var entity = require('@back4app/back4app-entity');
var classes = entity.utils.classes;
var objects = entity.utils.objects;
var Adapter = entity.adapters.Adapter;
var Entity = entity.models.Entity;
var AssociationAttribute = entity.models.attributes.types.AssociationAttribute;

var QueryError = require('./errors').QueryError;

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

  var _database = null;
  var _databaseIsLocked = false;
  var _databaseRequestQueue = [];

  this.getDatabase = getDatabase;
  this.openConnection = openConnection;
  this.closeConnection = closeConnection;

  expect(arguments).to.have.length.within(
    1,
    2,
    'Invalid arguments length when creating a new MongoAdapter ' +
    '(it has to be passed from 1 to 2 arguments)'
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

  function getDatabase() {
    var mongoAdapter = this;

    expect(arguments).to.have.length(
      0,
      'Invalid arguments length when getting a database in a MongoAdapter ' +
      '(it has to be passed no arguments)'
    );

    return new Promise(function (resolve, reject) {
      if (_databaseIsLocked || !_database) {
        mongoAdapter
          .openConnection()
          .then(function () {
            resolve(_database);
          })
          .catch(function (error) {
            reject(error);
          });
      } else {
        resolve(_database);
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
    expect(arguments).to.have.length(
      0,
      'Invalid arguments length when opening a connection in a MongoAdapter ' +
      '(it has to be passed no arguments)'
    );

    return new Promise(function (resolve, reject) {
      if (_databaseIsLocked) {
        _databaseRequestQueue.push(function () {
          openConnection().then(resolve).catch(reject);
        });
      } else if (_database) {
        resolve();
      } else {
        _databaseIsLocked = true;

        MongoClient
          .connect(connectionUrl, connectionOptions)
          .then(function (database) {
            _database = database;
            _databaseIsLocked = false;
            resolve();
            _processDatabaseRequestQueue();
          })
          .catch(function (error) {
            _databaseIsLocked = false;
            reject(error);
            _processDatabaseRequestQueue();
          });
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
      if (_databaseIsLocked) {
        _databaseRequestQueue.push(function () {
          closeConnection()
            .then(resolve)
            .catch(reject);
        });
      } else if (!_database) {
        resolve();
      } else {
        _databaseIsLocked = true;
        _database
          .close()
          .then(function () {
            _database = null;
            _databaseIsLocked = false;
            resolve();
            _processDatabaseRequestQueue();
          })
          .catch(function (error) {
            _databaseIsLocked = false;
            reject(error);
            _processDatabaseRequestQueue();
          });
      }
    });
  }

  function _processDatabaseRequestQueue() {
    while (_databaseRequestQueue.length > 0) {
      _databaseRequestQueue.splice(0,1)[0]();
    }
  }
}

classes.generalize(Adapter, MongoAdapter);

MongoAdapter.prototype.loadAttribute = loadAttribute;
MongoAdapter.prototype.insertObject = insertObject;
//MongoAdapter.prototype.instanceToJSON = instanceToJSON;
MongoAdapter.prototype.getObject = getObject;

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

function insertObject() {
  return this
    .getDatabase()
    .then(function (database) {
      return database;
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

function getObject(EntityClass, query) {
  var cursor;
  var document;

  function findDocument(db) {
    // copy query to not mess with user's object
    query = objects.copy(query);

    // rename id field
    if (query.hasOwnProperty('id')) {
      query._id = query.id;
      delete query.id;
    }

    // find collection name
    var GeneralClass = EntityClass;
    while (GeneralClass.General !== Entity) {
      GeneralClass = GeneralClass.General;
    }
    var name = GeneralClass.specification.name;

    // perform query
    cursor = db.collection(name).find(query);
    return cursor.next();
  }

  function checkNotEmpty(doc) {
    // check for no result
    if (doc === null) {
      throw new QueryError('Object does not exist');
    }
    // save document
    document = doc;
  }

  function checkNotMultiple() {
    // check for multiple results
    return cursor.hasNext()
      .then(function (hasNext) {
        if (hasNext) {
          throw new QueryError('Query matches multiple objects');
        }
      });
  }

  function populateEntity() {
    // return populated entity
    return _documentToObject(document);
  }

  return this.getDatabase()
    .then(findDocument)
    .then(checkNotEmpty)
    .then(checkNotMultiple)
    .then(populateEntity);
}

function _documentToObject(document) {
  var obj = objects.copy(document);

  // replace `_id` with `id`
  if (obj.hasOwnProperty('_id')) {
    obj.id = obj._id;
    delete obj._id;
  }

  // get document class and remove `Entity`
  var EntityClass = Entity.getSpecialization(obj.Entity);
  delete obj.Entity;

  // loop through entity's attributes and replace associations with instances
  var attributes = EntityClass.specification.attributes;
  for (var attrName in attributes) {
    if (attributes.hasOwnProperty(attrName) && obj.hasOwnProperty(attrName)) {
      // check for association
      var attr = attributes[attrName];
      if (attr instanceof AssociationAttribute) {
        var multiplicity = attr.multiplicity;
        if (multiplicity === '1' || multiplicity === '0..1') {
          // single related object
          obj[attrName] = _documentToObject(obj[attrName]);
        } else {
          // array of related objects
          var items = obj[attrName];
          for (var i = 0; i < items.length; i++) {
            items[i] = _documentToObject(items[i]);
          }
        }
      }
    }
  }

  return new EntityClass(obj);
}
