'use strict';

var chai = require('chai');
var expect = chai.expect;
var Assertion = chai.Assertion;
var AssertionError = chai.AssertionError;
var chaiAsPromised = require('chai-as-promised');
var mongodb = require('mongodb');
var Promise = require('bluebird');
var Entity = require('@back4app/back4app-entity').models.Entity;

var MongoAdapter = require('../../../').MongoAdapter;
var QueryError = require('../../../').errors.QueryError;

// custom assertions

Assertion.addMethod('collectionOf', function (type) {
  var obj = this._obj;

  // check for correct chained object
  new Assertion(obj).to.be.an('array');

  // check for collection item's types
  for (var i = 0; i < obj.length; i++) {
    var item = obj[i];
    new Assertion(item).to.be.instanceOf(type);
  }
});

// chai-as-promised setup (must run after custom assertion definitions)

chai.use(chaiAsPromised);

// unit tests

describe('MongoAdapter', function () {
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
      books: {type: 'Book', multiplicity: '*'},
      bestSeller: {type: 'Book', multiplicity: '1'}
    }
  });

  var Book = Entity.specify({
    name: 'Book',
    attributes: {
      title: {type: 'String'},
      publishedAt: {type: 'Date'}
    }
  });

  var $User = Entity.specify({
    name: '$User',
    dataName: 'User',
    attributes: {
      login: {type: 'String'}
    }
  });

  // testing vars
  var mongoAdapter;
  var db;

  // open connections
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

  // close connections
  after(function () {
    return Promise.all([
      mongoAdapter.closeConnection(),
      db.close()
    ]);
  });

  describe('#getObject()', function () {
    // global tests
    it('should return a promise', function () {
      var result = mongoAdapter.getObject(Person, {});
      expect(result).to.be.instanceOf(Promise);
      result.catch(function () {}); // ignore query errors, only testing type
    });

    it('should not work with wrong arguments', function () {
      // few arguments
      expect(function () {
        mongoAdapter.getObject();
      }).to.throw(AssertionError);

      expect(function () {
        mongoAdapter.getObject(Person);
      }).to.throw(AssertionError);

      // too many arguments
      expect(function () {
        mongoAdapter.getObject(Person, {}, {});
      }).to.throw(AssertionError);

      // wrong arguments
      expect(mongoAdapter.getObject({}, {}))
        .to.eventually.be.rejectedWith(AssertionError);
    });

    describe('simple objects', function () {
      // back4app entity instances
      var john = new Person({id: '0ca3c8c9-41a7-4967-a285-21f8cb4db2c0',
        name: 'John', age: 30, married: true});
      var theo = new Person({id: '5c2ca70f-d51a-4c97-a3ea-1668bde10fe7',
        name: 'Theo', age: 20, married: false});
      var will = new Person({id: 'd609db0b-b1f4-421a-a5f2-df8934ab023f',
        name: 'Will', age: 30, married: false});

      beforeEach(function () {
        // populate test database
        return db.collection('Person').insertMany([
          {Entity: 'Person', _id: '0ca3c8c9-41a7-4967-a285-21f8cb4db2c0',
            name: 'John', age: 30, married: true},
          {Entity: 'Person', _id: '5c2ca70f-d51a-4c97-a3ea-1668bde10fe7',
            name: 'Theo', age: 20, married: false},
          {Entity: 'Person', _id: 'd609db0b-b1f4-421a-a5f2-df8934ab023f',
            name: 'Will', age: 30, married: false}
        ]);
      });

      afterEach(function () {
        // clear test database
        return db.dropDatabase();
      });

      it('should get object by id', function () {
        return expect(mongoAdapter.getObject(Person, {
          id: '0ca3c8c9-41a7-4967-a285-21f8cb4db2c0'
        }))
          .to.become(john)
          .and.instanceOf(Person);
      });

      it('should get object by custom property', function () {
        return expect(mongoAdapter.getObject(Person, {
          name: 'Theo'
        }))
          .to.become(theo)
          .and.instanceOf(Person);
      });

      it('should get object by multiple properties', function () {
        return expect(mongoAdapter.getObject(Person, {
          age: 30,
          married: false
        }))
          .to.become(will)
          .and.instanceOf(Person);
      });

      it('should get object by complex query', function () {
        return expect(mongoAdapter.getObject(Person, {
          name: {$in: ['John', 'Theo']},
          age: {$gt: 25}
        }))
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
      var john = new Author({id: '0ca3c8c9-41a7-4967-a285-21f8cb4db2c0',
        name: 'John', age: 30, married: true, readers: 1000});
      var theo = new Author({id: '5c2ca70f-d51a-4c97-a3ea-1668bde10fe7',
        name: 'Theo', age: 20, married: false, readers: 450});
      var will = new Author({id: 'd609db0b-b1f4-421a-a5f2-df8934ab023f',
        name: 'Will', age: 30, married: false, readers: 1000});

      beforeEach(function () {
        // populate test database
        return db.collection('Person').insertMany([// Author --> Person
          {Entity: 'Author', _id: '0ca3c8c9-41a7-4967-a285-21f8cb4db2c0',
            name: 'John', age: 30, married: true, readers: 1000},
          {Entity: 'Author', _id: '5c2ca70f-d51a-4c97-a3ea-1668bde10fe7',
            name: 'Theo', age: 20, married: false, readers: 450},
          {Entity: 'Author', _id: 'd609db0b-b1f4-421a-a5f2-df8934ab023f',
            name: 'Will', age: 30, married: false, readers: 1000}
        ]);
      });

      afterEach(function () {
        // clear test database
        return db.dropDatabase();
      });

      it('should get object by id', function () {
        return expect(mongoAdapter.getObject(Author, {
          id: '0ca3c8c9-41a7-4967-a285-21f8cb4db2c0'
        }))
          .to.become(john)
          .and.instanceOf(Author);
      });

      it('should get object by custom property', function () {
        return expect(mongoAdapter.getObject(Author, {
          readers: 450
        }))
          .to.become(theo)
          .and.instanceOf(Author);
      });

      it('should get object by parent property', function () {
        return expect(mongoAdapter.getObject(Author, {
          name: 'Theo'
        }))
          .to.become(theo)
          .and.instanceOf(Author);
      });

      it('should get object by multiple properties', function () {
        return expect(mongoAdapter.getObject(Author, {
          married: false,
          readers: 1000
        }))
          .to.become(will)
          .and.instanceOf(Author);
      });

      it('should get object using parent\'s class', function () {
        return expect(mongoAdapter.getObject(Person, {
          id: '0ca3c8c9-41a7-4967-a285-21f8cb4db2c0'
        }))
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
      var john = new Author({id: '0ca3c8c9-41a7-4967-a285-21f8cb4db2c0',
        name: 'John', age: 30, married: true, readers: 1000,
        // books populated with id only
        books: [
          new Book({id: '2f3e8d4b-309c-4261-a462-6634ee8ca40d'}), // Dracula
          new Book({id: '1da78d86-de7a-4818-8737-e5723afdca85'}) // Hamlet
        ],
        bestSeller: new Book({id: '4232e3ba-129e-4507-a908-4fef92c7bbc7'})
      });

      beforeEach(function () {
        // populate test database
        return Promise.all([
          db.collection('Book').insertMany([
            {Entity: 'Book', _id: '2f3e8d4b-309c-4261-a462-6634ee8ca40d',
              title: 'Dracula', publishedAt: new Date('1986-05-12')},
            {Entity: 'Book', _id: '1da78d86-de7a-4818-8737-e5723afdca85',
              title: 'Hamlet', publishedAt: new Date('2005-08-01')},
            {Entity: 'Book', _id: '4232e3ba-129e-4507-a908-4fef92c7bbc7',
              title: 'Harry Potter', publishedAt: new Date('1997-06-26')}
          ]),
          db.collection('Person').insertOne({// Author --> Person
            Entity: 'Author', _id: '0ca3c8c9-41a7-4967-a285-21f8cb4db2c0',
            name: 'John', age: 30, married: true, readers: 1000,
            books: [
              {Entity: 'Book', id: '2f3e8d4b-309c-4261-a462-6634ee8ca40d'},
              {Entity: 'Book', id: '1da78d86-de7a-4818-8737-e5723afdca85'}
            ],
            bestSeller: {
              Entity: 'Book', id: '4232e3ba-129e-4507-a908-4fef92c7bbc7'
            }
          })
        ]);
      });

      afterEach(function () {
        // clear test database
        return db.dropDatabase();
      });

      it('should get object by id', function () {
        return expect(mongoAdapter.getObject(Author, {
          id: '0ca3c8c9-41a7-4967-a285-21f8cb4db2c0'
        }))
          .to.become(john)
          .and.instanceOf(Author);
      });

      it('should get object using parent\'s class', function () {
        return expect(mongoAdapter.getObject(Person, {
          id: '0ca3c8c9-41a7-4967-a285-21f8cb4db2c0'
        }))
          .to.become(john)
          .and.instanceOf(Author);
      });

      it('should get object by association id', function () {
        return expect(mongoAdapter.getObject(Author, {
          'books.id': '2f3e8d4b-309c-4261-a462-6634ee8ca40d'
        }))
          .to.become(john)
          .and.instanceOf(Author);
      });
    });

    describe('objects with dataName', function () {
      // back4app entity instances
      // (ignore some lint rules on purpose, in order to be able to test)
      /* jshint newcap:false, unused:false */
      var user1 = new $User({id: 'f5b30df9-51f9-430e-9159-b058fe414dae',
        login: 'user1'});
      /* jshint newcap:false, unused:false */
      var user2 = new $User({id: '77cd4229-f376-4bd7-97df-62c35ee5ae51',
        login: 'user2'});
      /* jshint newcap:false, unused:false */
      var user3 = new $User({id: 'f4a369fd-36eb-40a2-9540-903c10b06f7e',
        login: 'user3'});

      beforeEach(function () {
        // populate test database
        return db.collection('User').insertMany([
          {Entity: '$User', _id: 'f5b30df9-51f9-430e-9159-b058fe414dae',
            login: 'user1'},
          {Entity: '$User', _id: '77cd4229-f376-4bd7-97df-62c35ee5ae51',
            login: 'user2'},
          {Entity: '$User', _id: 'f4a369fd-36eb-40a2-9540-903c10b06f7e',
            login: 'user3'}
        ]);
      });

      afterEach(function () {
        // clear test database
        return db.dropDatabase();
      });

      it('should get object by id', function () {
        return expect(mongoAdapter.getObject($User, {
          id: 'f5b30df9-51f9-430e-9159-b058fe414dae'
        }))
          .to.become(user1)
          .and.instanceOf($User);
      });
    });
  });

  describe('#findObjects()', function () {
    // global tests
    it('should return a promise', function () {
      var result = mongoAdapter.findObjects(Person, {});
      expect(result).to.be.instanceOf(Promise);
      result.catch(function () {}); // ignore query errors, only testing type
    });

    it('should not work with wrong arguments', function () {
      // few arguments
      expect(function () {
        mongoAdapter.findObjects();
      }).to.throw(AssertionError);

      expect(function () {
        mongoAdapter.findObjects(Person);
      }).to.throw(AssertionError);

      // too many arguments
      expect(function () {
        mongoAdapter.findObjects(Person, {}, {});
      }).to.throw(AssertionError);

      // wrong arguments
      expect(mongoAdapter.findObjects({}, {}))
        .to.eventually.be.rejectedWith(AssertionError);
    });

    describe('simple objects', function () {
      // back4app entity instances
      var john = new Person({id: '0ca3c8c9-41a7-4967-a285-21f8cb4db2c0',
        name: 'John', age: 30, married: true});
      var theo = new Person({id: '5c2ca70f-d51a-4c97-a3ea-1668bde10fe7',
        name: 'Theo', age: 20, married: false});
      var will = new Person({id: 'd609db0b-b1f4-421a-a5f2-df8934ab023f',
        name: 'Will', age: 30, married: false});

      beforeEach(function () {
        // populate test database
        return db.collection('Person').insertMany([
          {Entity: 'Person', _id: '0ca3c8c9-41a7-4967-a285-21f8cb4db2c0',
            name: 'John', age: 30, married: true},
          {Entity: 'Person', _id: '5c2ca70f-d51a-4c97-a3ea-1668bde10fe7',
            name: 'Theo', age: 20, married: false},
          {Entity: 'Person', _id: 'd609db0b-b1f4-421a-a5f2-df8934ab023f',
            name: 'Will', age: 30, married: false}
        ]);
      });

      afterEach(function () {
        // clear test database
        return db.dropDatabase();
      });

      it('should find objects by id', function () {
        return expect(mongoAdapter.findObjects(Person, {
          id: {
            $in: [
              '0ca3c8c9-41a7-4967-a285-21f8cb4db2c0',
              '5c2ca70f-d51a-4c97-a3ea-1668bde10fe7'
            ]
          }
        }))
          .to.become([john, theo])
          .and.collectionOf(Person);
      });

      it('should find objects by custom property', function () {
        return expect(mongoAdapter.findObjects(Person, {
          name: {
            $in: ['Theo', 'Will']
          }
        }))
          .to.become([theo, will])
          .and.collectionOf(Person);
      });

      it('should find objects by multiple properties', function () {
        return expect(mongoAdapter.findObjects(Person, {
          age: {$gt: 25},
          married: false
        }))
          .to.become([will])
          .and.collectionOf(Person);
      });

      it('should return empty array on query with no result', function () {
        return expect(mongoAdapter.findObjects(Person, {name: 'Nobody'}))
          .to.become([]);
      });
    });

    describe('objects with generalization', function () {
      // back4app entity instances
      var john = new Author({id: '0ca3c8c9-41a7-4967-a285-21f8cb4db2c0',
        name: 'John', age: 30, married: true, readers: 1000});
      var theo = new Author({id: '5c2ca70f-d51a-4c97-a3ea-1668bde10fe7',
        name: 'Theo', age: 20, married: false, readers: 450});
      var will = new Author({id: 'd609db0b-b1f4-421a-a5f2-df8934ab023f',
        name: 'Will', age: 30, married: false, readers: 1000});

      beforeEach(function () {
        // populate test database
        return db.collection('Person').insertMany([// Author --> Person
          {Entity: 'Author', _id: '0ca3c8c9-41a7-4967-a285-21f8cb4db2c0',
            name: 'John', age: 30, married: true, readers: 1000},
          {Entity: 'Author', _id: '5c2ca70f-d51a-4c97-a3ea-1668bde10fe7',
            name: 'Theo', age: 20, married: false, readers: 450},
          {Entity: 'Author', _id: 'd609db0b-b1f4-421a-a5f2-df8934ab023f',
            name: 'Will', age: 30, married: false, readers: 1000}
        ]);
      });

      afterEach(function () {
        // clear test database
        return db.dropDatabase();
      });

      it('should find objects by id', function () {
        return expect(mongoAdapter.findObjects(Author, {
          id: {
            $in: [
              '0ca3c8c9-41a7-4967-a285-21f8cb4db2c0',
              '5c2ca70f-d51a-4c97-a3ea-1668bde10fe7'
            ]
          }
        }))
          .to.become([john, theo])
          .and.collectionOf(Author);
      });

      it('should find objects by custom property', function () {
        return expect(mongoAdapter.findObjects(Author, {
          readers: {$gt: 500}
        }))
          .to.become([john, will])
          .and.collectionOf(Author);
      });

      it('should find objects by parent property', function () {
        return expect(mongoAdapter.findObjects(Author, {
          name: {
            $in: ['Theo', 'Will']
          }
        }))
          .to.become([theo, will])
          .and.collectionOf(Author);
      });

      it('should find objects by multiple properties', function () {
        return expect(mongoAdapter.findObjects(Author, {
          married: false,
          readers: 1000
        }))
          .to.become([will])
          .and.collectionOf(Author);
      });

      it('should find objects using parent\'s class', function () {
        return expect(mongoAdapter.findObjects(Person, {
          id: '0ca3c8c9-41a7-4967-a285-21f8cb4db2c0'
        }))
          .to.become([john])
          .and.collectionOf(Author);
      });

      it('should return empty array on query with no result', function () {
        return expect(mongoAdapter.findObjects(Author, {
          name: 'Nobody'
        }))
          .to.become([]);
      });
    });

    describe('objects with association', function () {
      // back4app entity instances
      var john = new Author({id: '0ca3c8c9-41a7-4967-a285-21f8cb4db2c0',
        name: 'John', age: 30, married: true, readers: 1000,
        // books populated with id only
        books: [
          new Book({id: '2f3e8d4b-309c-4261-a462-6634ee8ca40d'}), // Dracula
          new Book({id: '1da78d86-de7a-4818-8737-e5723afdca85'}) // Hamlet
        ],
        bestSeller: new Book({id: '4232e3ba-129e-4507-a908-4fef92c7bbc7'})
      });

      beforeEach(function () {
        // populate test database
        return Promise.all([
          db.collection('Book').insertMany([
            {Entity: 'Book', _id: '2f3e8d4b-309c-4261-a462-6634ee8ca40d',
              title: 'Dracula', publishedAt: new Date('1986-05-12')},
            {Entity: 'Book', _id: '1da78d86-de7a-4818-8737-e5723afdca85',
              title: 'Hamlet', publishedAt: new Date('2005-08-01')},
            {Entity: 'Book', _id: '4232e3ba-129e-4507-a908-4fef92c7bbc7',
              title: 'Harry Potter', publishedAt: new Date('1997-06-26')}
          ]),
          db.collection('Person').insertOne({// Author --> Person
            Entity: 'Author', _id: '0ca3c8c9-41a7-4967-a285-21f8cb4db2c0',
            name: 'John', age: 30, married: true, readers: 1000,
            books: [
              {Entity: 'Book', id: '2f3e8d4b-309c-4261-a462-6634ee8ca40d'},
              {Entity: 'Book', id: '1da78d86-de7a-4818-8737-e5723afdca85'}
            ],
            bestSeller: {
              Entity: 'Book', id: '4232e3ba-129e-4507-a908-4fef92c7bbc7'
            }
          })
        ]);
      });

      afterEach(function () {
        // clear test database
        return db.dropDatabase();
      });

      it('should find objects by id', function () {
        return expect(mongoAdapter.findObjects(Author, {
          id: '0ca3c8c9-41a7-4967-a285-21f8cb4db2c0'
        }))
          .to.become([john])
          .and.collectionOf(Author);
      });

      it('should find objects using parent\'s class', function () {
        return expect(mongoAdapter.findObjects(Person, {
          id: '0ca3c8c9-41a7-4967-a285-21f8cb4db2c0'
        }))
          .to.become([john])
          .and.collectionOf(Author);
      });

      it('should find objects by association id', function () {
        return expect(mongoAdapter.findObjects(Author, {
          'books.id': '2f3e8d4b-309c-4261-a462-6634ee8ca40d'
        }))
          .to.become([john])
          .and.collectionOf(Author);
      });
    });

    describe('objects with dataName', function () {
      // back4app entity instances
      // (ignore some lint rules on purpose, in order to be able to test)
      /* jshint newcap:false, unused:false */
      var user1 = new $User({id: 'f5b30df9-51f9-430e-9159-b058fe414dae',
        login: 'user1'});
      /* jshint newcap:false, unused:false */
      var user2 = new $User({id: '77cd4229-f376-4bd7-97df-62c35ee5ae51',
        login: 'user2'});
      /* jshint newcap:false, unused:false */
      var user3 = new $User({id: 'f4a369fd-36eb-40a2-9540-903c10b06f7e',
        login: 'user3'});

      beforeEach(function () {
        // populate test database
        return db.collection('User').insertMany([
          {Entity: '$User', _id: 'f5b30df9-51f9-430e-9159-b058fe414dae',
            login: 'user1'},
          {Entity: '$User', _id: '77cd4229-f376-4bd7-97df-62c35ee5ae51',
            login: 'user2'},
          {Entity: '$User', _id: 'f4a369fd-36eb-40a2-9540-903c10b06f7e',
            login: 'user3'}
        ]);
      });

      afterEach(function () {
        // clear test database
        return db.dropDatabase();
      });

      it('should find objects by id', function () {
        return expect(mongoAdapter.findObjects($User, {
          id: {
            $in: [
              '77cd4229-f376-4bd7-97df-62c35ee5ae51',
              'f4a369fd-36eb-40a2-9540-903c10b06f7e'
            ]
          }
        }))
          .to.become([user2, user3])
          .and.collectionOf($User);
      });
    });
  });
});
