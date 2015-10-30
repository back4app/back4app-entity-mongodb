'use strict';

var expect = require('chai').expect;
var Promise = require('bluebird');
var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var entity = require('@back4app/back4app-entity');
var classes = entity.utils.classes;
var Adapter = entity.adapters.Adapter;
var Entity = entity.models.Entity;
var attributes = entity.models.attributes;
var Attribute = attributes.Attribute;

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
          .catch(reject);
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

MongoAdapter.prototype.loadEntity = loadEntity;
MongoAdapter.prototype.loadEntityAttribute = loadEntityAttribute;
MongoAdapter.prototype.insertObject = insertObject;
MongoAdapter.prototype.objectToDocument = objectToDocument;

function loadEntity(Entity) {
  expect(arguments).to.have.length(
    1,
    'Invalid arguments length when loading an entity in a ' +
    'MongoAdapter (it has to be passed 1 argument)'
  );

  expect(classes.isGeneral(entity.models.Entity, Entity)).to.be.equal(
    true,
    'Invalid argument "Entity" when loading an entity in a ' +
    'MongoAdapter (it has to be an Entity class)'
  );

  expect(Entity.dataName).to.not.equal(
    '',
    'The dataName of an Entity cannot be an empty string in a MongoAdapter'
  );

  expect(Entity.dataName).to.not.match(
    /^system\./,
    'The dataName of an Entity cannot start with "system." in a MongoAdapter'
  );

  expect(Entity.dataName).to.not.contain(
    '$',
    'The dataName of an Entity cannot contain "$" in a MongoAdapter'
  );

  expect(Entity.dataName).to.not.contain(
    '\0',
    'The dataName of an Entity cannot contain "\0" in a MongoAdapter'
  );
}

function loadEntityAttribute(Entity, attribute) {
  expect(arguments).to.have.length(
    2,
    'Invalid arguments length when loading an entity attribute in a ' +
    'MongoAdapter (it has to be passed 2 arguments)'
  );

  expect(classes.isGeneral(entity.models.Entity, Entity)).to.be.equal(
    true,
    'Invalid argument "Entity" when loading an entity attribute in a ' +
    'MongoAdapter (it has to be an Entity class)'
  );

  expect(attribute).to.be.an.instanceOf(
    Attribute,
    'Invalid argument "attribute" when loading an entity attribute in a ' +
    'MongoAdapter (it has to be an Attribute instance)'
  );

  var dataName = attribute.getDataName(Entity.adapterName);

  expect(dataName).to.not.match(
    /^\$/,
    'The dataName of an Attribute cannot start with "$" in a MongoAdapter'
  );

  expect(dataName).to.not.contain(
    '.',
    'The dataName of an Attribute cannot contain "." in a MongoAdapter'
  );

  expect(dataName).to.not.contain(
    '\0',
    'The dataName of an Attribute cannot contain "\0" in a MongoAdapter'
  );

  expect(dataName).to.not.equal(
    'Entity',
    'The dataName of an Attribute cannot be equal to "Entity" in a MongoAdapter'
  );

  expect(dataName).to.not.equal(
    '_id',
    'The dataName of an Attribute cannot be equal to "_id" in a MongoAdapter'
  );
}

function insertObject(entityObject) {
  var mongoAdapter = this;

  expect(arguments).to.have.length(
    1,
    'Invalid arguments length when inserting an object in a MongoAdapter ' +
    '(it has to be passed 1 argument)'
  );

  return new Promise(function (resolve, reject) {
    expect(entityObject).to.be.an.instanceOf(
      Entity,
      'Invalid argument "entityObject" when inserting an object in a ' +
      'MongoAdapter (it has to be an Entity instance)'
    );

    var EntityClass = entityObject.Entity;

    mongoAdapter
      .getDatabase()
      .then(function (database) {
        return database
          .collection(_getEntityCollectionName(EntityClass))
          .insertOne(
            objectToDocument(entityObject)
          );
      })
      .then(function (result) {
        expect(result.insertedCount).to.equal(
          1,
          'Invalid result.insertedCount return of collection.insertOne ' +
          'in MongoDB driver when inserting an Object (it should be 1)'
        );

        resolve();
      })
      .catch(reject);
  });
}

function objectToDocument(entityObject) {
  var document = {};

  var entityAttributes = entityObject.Entity.attributes;

  for (var attributeName in entityAttributes) {
    var attribute = entityAttributes[attributeName];
    var attributeDataName = attribute.getDataName(entityObject.adapterName);
    var attributeDataValue = attribute.getDataValue(
      entityObject[attributeName]
    );
    document[attributeDataName] = attributeDataValue;
  }

  document.Entity = entityObject.Entity.specification.name;

  document._id = entityObject.id;
  delete document.id;

  return document;
}

function _getEntityCollectionName(Entity) {
  while (
    Entity.General !== null &&
    !Entity.General.specification.isAbstract
    ) {
    Entity = Entity.General;
  }

  return Entity.dataName;
}
