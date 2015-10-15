'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = new SchemaBuilder();

function SchemaBuilder () {

  this.name = null;
  this.entity = null;
  this.mongoSchema = null;

  this.buildModel = buildModel;

  function buildModel(entity) {
    this.name = entity.name;
    var schemaObj = {};
    for (var attr in entity.attributes) {
      var attrObj = entity.attributes[attr];
      var type = {};

      if(attrObj.multiplicity.indexOf('*') !== -1) {
        type.type = [getSchemaType(attrObj.type)];
      } else {
        type.type = getSchemaType(attrObj.type);
      }

      if(attrObj.multiplicity.indexOf('1') !== 0) {
        type.required = true;
      }

      if(attrObj.default) {
        type.default = attrObj.default;
      }

      schemaObj[attrObj.name] = type;

      console.log(schemaObj);
      var schema = new Schema(schemaObj);
      var Model = mongoose.model(this.name, schema);

      return Model;
    }


  }

  function getSchemaType(string) {
    switch(string.toLowerCase()) {
      case 'object':
        return Object;
      case 'boolean':
        return Boolean;
      case 'datetime':
        return Date;
      case 'integer':
        return Number;
      case 'real':
        return Number;
      case 'string':
        return String;
      default:
        return Schema.Types.ObjectId;
    }
  }

  return this;
}
