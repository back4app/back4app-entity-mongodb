'use strict';

var expect = require('chai').expect;
var Promise = require('bluebird');
var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var entity = require('@back4app/back4app-entity');
var classes = entity.utils.classes;
var Adapter = entity.adapters.Adapter;
var models = entity.models;
var Entity = models.Entity;
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
  var _collections = {};

  this.getDatabase = getDatabase;
  this.openConnection = openConnection;
  this.closeConnection = closeConnection;
  this.loadEntity = loadEntity;
  this.loadEntityAttribute = loadEntityAttribute;

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

  /**
   * Gets the MongoClient Db object to be use to perform the operations.
   * @name module:back4app-entity-mongodb.MongoAdapter#getDatabase
   * @function
   * @returns {Promise.<Db|Error>} Promise that returns the MongoClient Db
   * object if succeed and the Error if failed.
   * @example
   * mongoAdapter.getDatabase()
   *   .then(function (database) {
   *     database.createCollection('myCollection');
   *   })
   *   .catch(function (error) {
   *     console.log(error);
   *   });
   */
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
   *     console.log('connection opened');
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
   *   .then(function () {
   *     console.log('connection closed');
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

  /**
   * Processes the database request queue.
   * @private
   * @name
   * module:back4app-entity-mongodb.MongoAdapter#_processDatabaseRequestQueue
   * @function
   * @example
   * _processDatabaseRequestQueue();
   */
  function _processDatabaseRequestQueue() {
    while (_databaseRequestQueue.length > 0) {
      _databaseRequestQueue.splice(0,1)[0]();
    }
  }

  function loadEntity(Entity) {
    expect(arguments).to.have.length(
      1,
      'Invalid arguments length when loading an entity in a ' +
      'MongoAdapter (it has to be passed 1 argument)'
    );

    expect(Entity).to.be.a(
      'function',
      'Invalid argument "Entity" when loading an entity in a ' +
      'MongoAdapter (it has to be an Entity class)'
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

    expect(_collections).to.not.have.ownProperty(
      Entity.dataName,
      'Failed to load the Entity called "' + Entity.specification.name +
      '" because it is not possible to have Entities with duplicated ' +
      'dataName in a MongoAdapter'
    );

    _collections[Entity.dataName] = [];
  }

  function loadEntityAttribute(Entity, attribute) {
    expect(arguments).to.have.length(
      2,
      'Invalid arguments length when loading an entity attribute in a ' +
      'MongoAdapter (it has to be passed 2 arguments)'
    );

    expect(Entity).to.be.a(
      'function',
      'Invalid argument "Entity" when loading an entity in a ' +
      'MongoAdapter (it has to be an Entity class)'
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
      'The dataName of an Attribute cannot be equal to "Entity" in a ' +
      'MongoAdapter'
    );

    expect(dataName).to.not.equal(
      '_id',
      'The dataName of an Attribute cannot be equal to "_id" in a MongoAdapter'
    );

    expect(_collections).to.have.ownProperty(
      Entity.dataName,
      'Failed to load the attribute in an Entity called "' +
      Entity.specification.name + '" because the Entity was not loaded yet'
    );

    expect(_collections[Entity.dataName]).to.not.contain(
      dataName,
      'Failed to load the attribute "' + attribute.name + '" in an Entity ' +
      'called "' + Entity.specification.name + '" because it is not ' +
      'possible to have attributes of the same Entity with duplicated ' +
      'dataName in a MongoAdapter'
    );

    _collections[Entity.dataName].push(dataName);
  }
}

classes.generalize(Adapter, MongoAdapter);

MongoAdapter.prototype.insertObject = insertObject;
MongoAdapter.prototype.objectToDocument = objectToDocument;
MongoAdapter.prototype.getEntityCollectionName = getEntityCollectionName;

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
          .collection(getEntityCollectionName(EntityClass))
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

/**
 * Converts an Entity object in a MongoDB document.
 * @name module:back4app-entity-mongodb.MongoAdapter#objectToDocument
 * @function
 * @param {!module:back4app-entity/models.Entity} entityObject The Entity object
 * to be converted to a MongoDB document.
 * @returns {Object.<string, *>} The MongoDB document that is a dictionary.
 * @example
 * var myDocument = mongoAdapter.objectToDocument(myObject);
 */
function objectToDocument(entityObject) {
  expect(arguments).to.have.length(
    1,
    'Invalid arguments length when converting an entity object in a ' +
    'MongoDB document (it has to be passed 1 argument)'
  );

  expect(entityObject).to.be.an.instanceOf(
    Entity,
    'Invalid argument "entityObject" when converting an entity object in a ' +
    'MongoDB document (it has to be an Entity instances)'
  );

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

/**
 * Gets the collection name in which the objects of a given Entity shall be
 * saved.
 * @name module:back4app-entity-mongodb.MongoAdapter#getEntityCollectionName
 * @function
 * @param {!Class} Entity The Entity class whose collection name will be get.
 * @returns {string} The collection name.
 * @example
 * var entityCollectionName = mongoAdapter.getEntityCollectionName(MyEntity);
 */
function getEntityCollectionName(Entity) {
  expect(arguments).to.have.length(
    1,
    'Invalid arguments length when getting the collection name of an Entity ' +
    'class (it has to be passed 1 argument)'
  );

  expect(Entity).to.be.a(
    'function',
    'Invalid argument "Entity" when getting the collection name of an ' +
    'Entity (it has to be an Entity class)'
  );

  expect(classes.isGeneral(models.Entity, Entity)).to.equal(
    true,
    'Invalid argument "Entity" when getting the collection name of an ' +
    'Entity (it has to be an Entity class)'
  );

  while (
    Entity.General !== null &&
    !Entity.General.specification.isAbstract
    ) {
    Entity = Entity.General;
  }

  return Entity.dataName;
}
