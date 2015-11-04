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

var QueryError = require('./errors').QueryError;

var models = entity.models;
var Attribute = entity.models.attributes.Attribute;

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
MongoAdapter.prototype.getObject = getObject;
MongoAdapter.prototype.findObjects = findObjects;
MongoAdapter.prototype.deleteObject = deleteObject;

MongoAdapter.prototype.objectToDocument = objectToDocument;
MongoAdapter.prototype.documentToObject = documentToObject;
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
 * Get object from the database matching given query.
 * @name module:back4app-entity-mongodb.MongoAdapter#getObject
 * @function
 * @returns {Promise.<object|Error>} Promise that returns found object if
 * succeed or Error if failed.
 * @example
 * mongoAdapter.getObject(Car, {color: 'red'})
 *   .then(function(car) {
 *     console.log(car);
 *   });
 */
function getObject(EntityClass, query) {
  expect(arguments).to.have.length(
    2,
    'Invalid arguments length when inserting an object in a MongoAdapter ' +
    '(it has to be passed 2 arguments)'
  );

  var cursor;
  var document;

  function findDocument(db) {
    cursor = _buildCursor(db, EntityClass, query);
    return cursor.next();
  }

  function checkNotEmpty(doc) {
    // save document
    document = doc;

    // check for no result
    if (doc === null) {
      throw new QueryError('Object does not exist');
    }
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
    return documentToObject(document, EntityClass.adapterName);
  }

  return this.getDatabase()
    .then(findDocument)
    .then(checkNotEmpty)
    .then(checkNotMultiple)
    .then(populateEntity);
}

/**
 * Find objects in the database matching given query.
 * @name module:back4app-entity-mongodb.MongoAdapter#findObjects
 * @function
 * @returns {Promise.<object|Error>} Promise that returns found objects if
 * succeed or Error if failed.
 * @example
 * mongoAdapter.findObjects(Car, {year: 1990})
 *   .then(function(cars) {
 *     for (var i = 0; i < cars.length; i++) {
 *       var car = cars[i];
 *       console.log(car);
 *     }
 *   });
 */
function findObjects(EntityClass, query) {
  expect(arguments).to.have.length(
    2,
    'Invalid arguments length when inserting an object in a MongoAdapter ' +
    '(it has to be passed 2 arguments)'
  );

  function findDocuments(db) {
    return _buildCursor(db, EntityClass, query).toArray();
  }

  function populateEntities(docs) {
    var entities = [];
    for (var i = 0; i < docs.length; i++) {
      entities.push(documentToObject(docs[i], EntityClass.adapterName));
    }
    return entities;
  }

  return this.getDatabase()
    .then(findDocuments)
    .then(populateEntities);
}

function _buildCursor(db, EntityClass, query) {
  // copy query to not mess with user's object
  query = objects.copy(query);

  // rename id field
  if (query.hasOwnProperty('id')) {
    query._id = query.id;
    delete query.id;
  }

  // find collection name
  var name = getEntityCollectionName(EntityClass);

  // build cursor
  return db.collection(name).find(query);
}

/**
 * Converts a MongoDB document to an Entity object.
 * @name module:back4app-entity-mongodb.MongoAdapter#documentToObject
 * @function
 * @param {Object.<string, *>} document The MongoDB document.
 * @param {String} adapterName The name of the entity adapter.
 * @returns {!module:back4app-entity/models.Entity} The converted Entity object.
 * @example
 * <pre>
 *   var myEntity = mongoAdapter.documentToObject(myDocument, 'mongo');
 * </pre>
 */
function documentToObject(document, adapterName) {
  var obj = {};

  // replace `_id` with `id`
  if (document.hasOwnProperty('_id')) {
    obj.id = document._id;
  }

  // get document class
  var EntityClass = Entity.getSpecialization(document.Entity);

  // loop through entity's attributes and replace with parsed values
  var attributes = EntityClass.attributes;
  for (var attrName in attributes) {
    if (attributes.hasOwnProperty(attrName)) {
      // get attribute name in database
      var attr = attributes[attrName];
      var dataName = attr.getDataName(adapterName);
      // check if name is present on document and replace with parsed value
      if (document.hasOwnProperty(dataName)) {
        obj[attrName] = attr.parseDataValue(document[dataName]);
      }
    }
  }

  return new EntityClass(obj);
}

function deleteObject(entityObject) {

  var mongoAdapter = this;

  expect(arguments).to.have.length(
    1,
    'Invalid arguments length when deleting an object in MongoAdapter ' +
    '(it has to be passed 1 argument)'
  );

  return new Promise(function (resolve, reject) {
    expect(entityObject).to.be.an.instanceOf(
      Entity,
      'Invalid argument "entityObject" when deleting an object in a ' +
      'MongoAdapter (it has to be an Entity instance)'
    );

    var EntityClass = entityObject.Entity;

    var promises = [];

    while (EntityClass) {
      promises.push(_deleteObject(EntityClass, entityObject.id));
      EntityClass = EntityClass.General;
    }

    EntityClass = entityObject.Entity;
    var entitySpecializations = EntityClass.specializations;
    for (var specialization in entitySpecializations) {
      promises.push
      (_deleteObject(entitySpecializations[specialization], entityObject.id));
    }

    Promise.all(promises)
      .then(resolve)
      .catch(reject);

    function _deleteObject(EntityClass, id) {
      return mongoAdapter
        .getDatabase()
        .then(function (database) {
          return database
            .collection(EntityClass.specification.name)
            .findOneAndDelete({_id: id});

        })
        .then(function (result) {
          expect(result.ok).to.equal(
            1,
            'Invalid result.ok return of collection.findOneAndDelete ' +
            'in MongoDB driver when deleting an Object (it should be 1)'
          );
        });
    }

  });
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
