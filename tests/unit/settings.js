//
// Created by davimacedo on 22/10/15.
//

var settings = require('@back4app/back4app-entity').settings;
var MongoAdapter = require('../../').MongoAdapter;

settings.ADAPTERS.default = new MongoAdapter(
  'mongodb://127.0.0.1:27017/back4app-entity-mongodb?connectTimeoutMS=1000'
);
