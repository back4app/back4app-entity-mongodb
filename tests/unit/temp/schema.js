'use strict';

var chai = require('chai');
var expect = chai.expect;
var AssertionError = chai.AssertionError;
var mongoose = require('mongoose');
require('mongoose-function')(mongoose);
var Schema;
var personSchema, storySchema, Story, Person;

before(function (done) {
  mongoose.connect('mongodb://localhost/test');
  var db = mongoose.connection;
  db.on('error', console.error.bind(console, 'connection error:'));
  db.once('open', function (callback) {
    console.log('connected!');
    Schema = mongoose.Schema;

    personSchema = Schema({
      _id     : Number,
      name    : String,
      age     : Number,
      stories : [{ type: Schema.Types.ObjectId, ref: 'Story' }]
    });
    storySchema = Schema({
      _creator : { type: Number, ref: 'Person' },
      title    : String,
      fans     : [{ type: Number, ref: 'Person' }]
    });
    Story  = mongoose.model('Story', storySchema);
    Person = mongoose.model('Person', personSchema);
    done();
  });
});

describe('Schema/Model', function () {

  beforeEach(function () {
    Story.remove({});
    Person.remove({});
    mongoose.connection.collections['stories'].drop();
    mongoose.connection.models = {};

    Story  = mongoose.model('Story', storySchema);
    Person = mongoose.model('Person', personSchema);
  });

  it('should add property only if defined on Schema', function (done) {
    var story1 = new Story({  title: 'The Mighty King of Nothing',
      thing: 'The Complete Story'});
    story1.save();

    storySchema.add({thing: {type: String}});
    Story  = mongoose.model('Story', storySchema);

    var story2 = new Story({  title: 'The Poor King of Everything',
      thing: 'The Complete Story'});
    story2.save();

    Story.find({}, function(err, stories) {
      expect(err).to.be.null;
      expect(stories[0]._doc.thing).to.be.undefined;
      expect(stories[1]._doc.thing).to.equal('The Complete Story');
      done();
    });
  });

  it.only('should return property even if it is removed from Schema', function (done) {
    storySchema.add({thing: {type: String}});
    var story1 = new Story({  title: 'The Mighty King of Nothing',
      thing: 'The Complete Story'});
    story1.save();

    storySchema.remove('thing');
    Story  = mongoose.model('Story', storySchema);

    var story2 = new Story({  title: 'The Poor King of Everything',
      thing: 'The Complete Story'});
    story2.save();

    Story.find({}, function(err, stories) {
      expect(err).to.be.null;
      stories[0].xablau = 'xablablau';
      console.log(stories);
      expect(stories[0]._doc.thing).to.equal('The Complete Story');
      expect(stories[1]._doc.thing).to.be.undefined;
      done();
    });
  });

  it('should cast the type according to the new Type', function (done) {
    storySchema.add({thing: {type: String}});
    var story1 = new Story({  title: 'The Mighty King of Nothing',
      thing: 'The Complete Story'});
    story1.save();

    storySchema.remove('thing');
    storySchema.add({thing: {type: Array}});
    Story  = mongoose.model('Story', storySchema);

    Story.find({}, function(err, stories) {
      expect(err).to.be.null;
      expect(stories[0]._doc.thing).to.be.an('array');
      done();
    });
  });

  it('should add default value if it is missing', function (done) {
    storySchema.add({thing: {type: String, default: 'Default Thing'}});
    var story1 = new Story({  title: 'The Mighty King of Nothing'});
    story1.save();

    Story.find({}, function(err, stories) {
      expect(err).to.be.null;
      expect(stories[0]._doc.thing).to.equal('Default Thing');
      done();
    });
  });

  it('should add default value if it is missing #2', function (done) {
    var story1 = new Story({  title: 'The Mighty King of Nothing'});
    story1.save();
    storySchema.add({thing: {type: String, default: 'Default Thing'}});
    Story  = mongoose.model('Story', storySchema);

    Story.find({}, function(err, stories) {
      expect(err).to.be.null;
      expect(stories[0]._doc.thing).to.equal('Default Thing');
      done();
    });
  });

  it('should save functions', function (done) {
    storySchema.add({thing: {type: Function}});
    var story1 = new Story({  title: 'The Mighty King of Nothing',
      thing: new Function()});
    story1.save();
    Story  = mongoose.model('Story', storySchema);

    Story.find({}, function(err, stories) {
      expect(err).to.be.null;
      expect(stories[0]._doc.thing).to.be.a('function');
      done();
    });
  });

  it('should return the document, even if invalid', function (done) {
    var story1 = new Story({title: 'The Mighty King of Nothing'});
    story1.save();
    storySchema.add({thing: {type: String, required: true}});
    Story  = mongoose.model('Story', storySchema);

    Story.find({}, function(err, stories) {
      expect(err).to.be.null;
      expect(stories[0]).to.not.be.undefined;
      expect(stories[0]._doc.thing).to.be.undefined;
      expect(stories[0].validateSync()).to.not.be.undefined;
      done();
    });
  });
});







//tests
