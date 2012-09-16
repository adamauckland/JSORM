JSORM
=====

Databases! In the browser! With JavaScript!

Who doesn't like databases? Not me, I love them. Can't get enough of them. When I'm not making databases, I'm thinking of databases to build databases.

So what the world needs now is more database ORMs. Probably in a trendy language like Ruby or Go.

So I made one in JavaScript instead. It only works on Safari, Chrome and Safari on mobile but I'm sure FireFox will catch up one day.

Here's an example:

var Tests = function() {
  //
	// create a database connection
	//
	var database = new JSORM.Database('ducks', '1.0', 'wherearemyducks', '100000');


	//
	// open database
	//
	var db = database.openDatabase();


	//
	// now define the tables
	//
	var Duck = new JSORM.Model(db, 'ducks');


	// test overriding ID
	//Duck.attachField(
	//	new JSORM.FieldTypes.IntegerField('id', false)
	//);
	Duck.attachField(
		new JSORM.FieldTypes.TextField('name', 50, false)
	);


	//
	// now get the row at ID=1 in the duck table
	//
	Duck.manager.Get({ id: 6 },
		function(data) {
			//
			// success, data should be the row data
			//
			if(data !== null) {
				console.log(data.name);
				data.name = 'This is a new thing modified booa';

				data.Save(function() {
					console.log('saved booa');
				}, function(error) {
					console.log(error.message);
				});
			}
		}, function(error) {
			//
			// get failed
			//
			console.log(error.message);
		}
	);


	//
	// test to get all items with an id below 5
	//
	Duck.manager.GetAll( { id__lessthan: 5 }, function(data) {
		console.log('Number of items received: ' + data.length );
	});


	//
	// test to get all items with a name of adam
	//
	Duck.manager.GetAll( { name__contains: 'booa' }, function(data) {
		console.log('Number of items received for booa: ' + data.length );

		console.log('removing item');
		if(data.length !== 0) {
			data[0].Remove(function() {
				// success
				console.log('remove success');
			}, function() {
				//
				console.log('remove fail');
			});
		}
		
	});
	 

	//
	// test insert
	//
	console.log('testing insert');
	var newThing = Duck.manager.Create();
	newThing.name = 'test insert';
	newThing.Save(function(data) {
		console.log('inserted ' + newThing.id);
	});
};


var ducks = new Tests();

--------------

To do:

Change code so it opens/closes the database per transaction.

Create tables

Foreign keys

M2M lookups (That's Many 2 Many lookups if you're not in the know and as databasey as me!)

