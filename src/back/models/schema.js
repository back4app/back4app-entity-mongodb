'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = new SchemaBuilder();

/**
 * Class that handles the Mongoose Schema creation.
 * @constructor
 * @memberof module:back4app/entity-mongodb/models
 * @example
 * module.exports = new SchemaBuilder();
 */
function SchemaBuilder() {
  this.buildModel = buildModel;

  /**
   * Returns the Model and registers the Schema within mongoose, using
   * the passed entity.
   * @name module:back4app/entity-mongodb/models/SchemaBuilder~buildModel
   * @function
   * @param {!module:back4app/entity/models/Entity}
   * entity Entity instance containing properties that shall become
   * the Schema properties.
   * @returns {module:mongoose/Model} The Mongoose Model based on Entity.
   * @example
   * schema.buildModel(Person);
   */
  function buildModel(entity) {
    var schemaObj = {};
    for (var attr in entity.attributes) {
      var attrObj = entity.attributes[attr];
      var type = {};

      if (attrObj.multiplicity.indexOf('*') !== -1) {
        type.type = [getSchemaType(attrObj.type)];
      } else {
        type.type = getSchemaType(attrObj.type);
      }

      if (attrObj.multiplicity.indexOf('1') !== 0) {
        type.required = true;
      }

      if (attrObj.default) {
        type.default = attrObj.default;
      }

      schemaObj[attrObj.name] = type;
    }
    var schema = new Schema(schemaObj);
    var Model = mongoose.model(entity.specification.name, schema);
    return Model;

  }

  /**
   * Returns SchemaType based on AttributeType function from Entity Attribute.
   * @name module:back4app/entity-mongodb/models/SchemaBuilder~getSchemaType
   * @function
   * @private
   * @param {!function} AttributeType function that contains the type of
   * an attribute.
   * @returns {!object} SchemaType to be used to generate the Model.
   * @example
   * type.type = getSchemaType(attrObj.type);
   */
  function getSchemaType(type) {
    switch (type.name) {
      case 'ObjectAttribute':
        return Object;
      case 'BooleanAttribute':
        return Boolean;
      case 'DateAttribute':
        return Date;
      case 'NumberAttribute':
        return Number;
      case 'StringAttribute':
        return String;
      default:
        return Schema.Types.ObjectId;
    }
  }

  return this;
}
