'use strict';

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var expect = require('chai').expect;
var mongodb = require('mongodb');
var Promise = require('bluebird');
var Entity = require('@back4app/back4app-entity').models.Entity;

var MongoAdapter = require('../../../').MongoAdapter;
var QueryError = require('../../../').errors.QueryError;

// chai-as-promised setup
chai.use(chaiAsPromised);


describe('MongoAdapter', function () {
  var mongoAdapter;
  var db;

  before(function () {
    var url = 'mongodb://127.0.0.1:27017/test';

    // instantiate entity mongo adapter
    mongoAdapter = new MongoAdapter(url);

    // create connection to MongoDB
    return mongodb.MongoClient.connect(url)
      .then(function (database) {
        db = database;
      });
  });

  after(function () {
    return Promise.all([
      mongoAdapter.closeConnection(),
      db.close()
    ]);
  });

  // TODO: remove `.only`
  describe.only('#getObject()', function () {
    // back4app Entities
    var Person = Entity.specify({
      name: 'Person',
      attributes: {
        name: {type: 'String'},
        age: {type: 'Number'},
        married: {type: 'Boolean'}
      }
    });

    var Author = Person.specify({
      name: 'Author',
      attributes: {
        readers: {type: 'Number'},
        books: {type: 'Book', multiplicity: '*'}
      }
    });

    var Book = Entity.specify({
      name: 'Book',
      attributes: {
        title: {type: 'String'},
        publishedAt: {type: 'Date'}
      }
    });

    // global tests
    it('should return a promise', function () {
      var result = mongoAdapter.getObject(Person, {});
      expect(result).to.be.instanceOf(Promise);
      result.catch(function () {}); // ignore query errors, only testing type
    });

    describe('simple objects', function () {
      // back4app entity instances
      var john = new Person({id: '0ca3c8c9-41a7-4967-a285-21f8cb4db2c0', name: 'John', age: 30, married: true});
      var theo = new Person({id: '5c2ca70f-d51a-4c97-a3ea-1668bde10fe7', name: 'Theo', age: 20, married: false});
      var will = new Person({id: 'd609db0b-b1f4-421a-a5f2-df8934ab023f', name: 'Will', age: 30, married: false});

      beforeEach(function () {
        // populate test database
        return db.collection('Person').insertMany([
          {Entity: 'Person', _id: '0ca3c8c9-41a7-4967-a285-21f8cb4db2c0', name: 'John', age: 30, married: true},
          {Entity: 'Person', _id: '5c2ca70f-d51a-4c97-a3ea-1668bde10fe7', name: 'Theo', age: 20, married: false},
          {Entity: 'Person', _id: 'd609db0b-b1f4-421a-a5f2-df8934ab023f', name: 'Will', age: 30, married: false}
        ]);
      });

      afterEach(function () {
        // clear test database
        return db.dropDatabase();
      });

      it('should get object by id', function () {
        return expect(mongoAdapter.getObject(Person, {id: '0ca3c8c9-41a7-4967-a285-21f8cb4db2c0'}))
          .to.become(john)
          .and.instanceOf(Person);
      });

      it('should get object by custom property', function () {
        return expect(mongoAdapter.getObject(Person, {name: 'Theo'}))
          .to.become(theo)
          .and.instanceOf(Person);
      });

      it('should get object by multiple properties', function () {
        return expect(mongoAdapter.getObject(Person, {age: 30, married: false}))
          .to.become(will)
          .and.instanceOf(Person);
      });

      it('should get object by complex query', function () {
        return expect(mongoAdapter.getObject(Person, {name: {$in: ['John', 'Theo']}, age: {$gt: 25}}))
          .to.become(john)
          .and.instanceOf(Person);
      });

      it('should reject query with no result', function () {
        return expect(mongoAdapter.getObject(Person, {name: 'Nobody'}))
          .to.eventually.be.rejectedWith(QueryError);
      });

      it('should reject query with multiple results', function () {
        return expect(mongoAdapter.getObject(Person, {}))
          .to.eventually.be.rejectedWith(QueryError);
      });
    });

    describe('objects with generalization', function () {
      // back4app entity instances
      var john = new Author({id: '0ca3c8c9-41a7-4967-a285-21f8cb4db2c0', name: 'John', age: 30, married: true, readers: 1000});
      var theo = new Author({id: '5c2ca70f-d51a-4c97-a3ea-1668bde10fe7', name: 'Theo', age: 20, married: false, readers: 450});
      var will = new Author({id: 'd609db0b-b1f4-421a-a5f2-df8934ab023f', name: 'Will', age: 30, married: false, readers: 1000});

      beforeEach(function () {
        // populate test database
        return db.collection('Person').insertMany([// Author --> Person
          {Entity: 'Author', _id: '0ca3c8c9-41a7-4967-a285-21f8cb4db2c0', name: 'John', age: 30, married: true, readers: 1000},
          {Entity: 'Author', _id: '5c2ca70f-d51a-4c97-a3ea-1668bde10fe7', name: 'Theo', age: 20, married: false, readers: 450},
          {Entity: 'Author', _id: 'd609db0b-b1f4-421a-a5f2-df8934ab023f', name: 'Will', age: 30, married: false, readers: 1000}
        ]);
      });

      afterEach(function () {
        // clear test database
        return db.dropDatabase();
      });

      it('should get object by id', function () {
        return expect(mongoAdapter.getObject(Author, {id: '0ca3c8c9-41a7-4967-a285-21f8cb4db2c0'}))
          .to.become(john)
          .and.instanceOf(Author);
      });

      it('should get object by custom property', function () {
        return expect(mongoAdapter.getObject(Author, {readers: 450}))
          .to.become(theo)
          .and.instanceOf(Author);
      });

      it('should get object by parent property', function () {
        return expect(mongoAdapter.getObject(Author, {name: 'Theo'}))
          .to.become(theo)
          .and.instanceOf(Author);
      });

      it('should get object by multiple properties', function () {
        return expect(mongoAdapter.getObject(Author, {married: false, readers: 1000}))
          .to.become(will)
          .and.instanceOf(Author);
      });

      it('should get object using parent\'s class', function () {
        return expect(mongoAdapter.getObject(Person, {id: '0ca3c8c9-41a7-4967-a285-21f8cb4db2c0'}))
          .to.become(john)
          .and.instanceOf(Author);
      });

      it('should reject query with no result', function () {
        return expect(mongoAdapter.getObject(Author, {name: 'Nobody'}))
          .to.eventually.be.rejectedWith(QueryError);
      });

      it('should reject query with multiple results', function () {
        return expect(mongoAdapter.getObject(Author, {}))
          .to.eventually.be.rejectedWith(QueryError);
      });
    });

    describe('objects with association', function () {
      // back4app entity instances
      var john = new Author({
        id: '0ca3c8c9-41a7-4967-a285-21f8cb4db2c0', name: 'John', age: 30, married: true, readers: 1000,
        // books not populated
        books: [
          new Book({id: '2f3e8d4b-309c-4261-a462-6634ee8ca40d'}), // Dracula
          new Book({id: '1da78d86-de7a-4818-8737-e5723afdca85'}) // Hamlet
        ]
      });

      beforeEach(function () {
        // populate test database
        return Promise.all([
          db.collection('Book').insertMany([
            {Entity: 'Book', _id: '2f3e8d4b-309c-4261-a462-6634ee8ca40d', title: 'Dracula', publishedAt: new Date('1986-05-12')},
            {Entity: 'Book', _id: '1da78d86-de7a-4818-8737-e5723afdca85', title: 'Hamlet', publishedAt: new Date('2005-08-01')}
          ]),
          db.collection('Person').insertOne({// Author --> Person
            Entity: 'Author', _id: '0ca3c8c9-41a7-4967-a285-21f8cb4db2c0', name: 'John', age: 30, married: true, readers: 1000,
            books: [
              {Entity: 'Book', id: '2f3e8d4b-309c-4261-a462-6634ee8ca40d'}, // Dracula
              {Entity: 'Book', id: '1da78d86-de7a-4818-8737-e5723afdca85'} // Hamlet
            ]
          })
        ]);
      });

      afterEach(function () {
        // clear test database
        return db.dropDatabase();
      });

      it('should get object by id', function () {
        return expect(mongoAdapter.getObject(Author, {id: '0ca3c8c9-41a7-4967-a285-21f8cb4db2c0'}))
          .to.become(john)
          .and.instanceOf(Author);
      });

      it('should get object using parent\'s class', function () {
        return expect(mongoAdapter.getObject(Person, {id: '0ca3c8c9-41a7-4967-a285-21f8cb4db2c0'}))
          .to.become(john)
          .and.instanceOf(Author);
      });

      it('should get object by association id', function () {
        return expect(mongoAdapter.getObject(Author, {'books.id': '2f3e8d4b-309c-4261-a462-6634ee8ca40d'}))
          .to.become(john)
          .and.instanceOf(Author);
      });
    });
  });
});
