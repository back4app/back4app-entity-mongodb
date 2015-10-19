'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Type =
  require('../../../node_modules/@back4app/back4app-entity').models.attributes.types;

module.exports = new SchemaBuilder();

function SchemaBuilder () {

  this.name = null;
  this.entity = null;
  this.mongoSchema = null;

  this.buildModel = buildModel;

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
    var Model = mongoose.model(entity.name, schema);
    return Model;

  }

  function getSchemaType(type) {
    switch(typeof type) {
      case Type.ObjectAttribute:
        return Object;
      case Type.BooleanAttribute:
        return Boolean;
      case Type.DateAttribute:
        return Date;
      case Type.NumberAttribute:
        return Number;
      case Type.StringAttribute:
        return String;
      default:
        return Schema.Types.ObjectId;
    }
  }

  return this;
}