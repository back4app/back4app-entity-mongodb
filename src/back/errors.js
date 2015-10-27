'use strict';

var util = require('util');

/**
 * Contains Error Classes used to be thrown when the adapter API is not used
 * correctly.
 * @module back4app-entity-mongodb/errors
 */
module.exports = {};

module.exports.QueryError = QueryError;

/**
 * Error class to be used when an invalid query is made to the adapter methods.
 * @constructor
 * @extends Error
 * @param {?string} [message] Error message
 * @memberof back4app-entity-mongodb/errors
 */
function QueryError(message) {
  this.name = 'QueryError';
  this.message = message || 'Invalid query';
  this.stack = (new Error()).stack;
}

util.inherits(QueryError, Error);
