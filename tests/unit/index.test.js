//var db = mongoose.connection;
//db.on('error', console.error.bind(console, 'connection error:'));
//db.once('open', function (callback) {
//  // yay!
//});
'use strict';

var expect = require('chai').expect;
var index = require('../../');
var backIndex = require('../../src/back');

describe('index', function () {
  it('expect to connect with mongoose', function () {
    mongoose.connect('mongodb://localhost/test');
  });
});
