











var Duck;

var Tests = function() {
	//
	// create a database connection
	//
	var databaseConnection = new JSORM.Database('ducks', '1.0', 'wherearemyducks', '100000');


	//
	// open database
	//
	var db = databaseConnection.openDatabase();


	//
	// now define the tables
	//
	Duck = new JSORM.Model(db, 'ducks');


	//
	// Create the table if we need to - note this will be automated
	//
	Duck.data.execute('CREATE TABLE IF NOT EXISTS "ducks" ("id" INTEGER PRIMARY KEY ASC AUTOINCREMENT,"name" TEXT);', [], carryOn, function() { });
};


//
// Callback from returning from creating the table
//
function carryOn() {
	// test overriding ID
	//Duck.attachField(
	//	new JSORM.FieldTypes.IntegerField('id', false)
	//);
	Duck.attachField(
		new JSORM.FieldTypes.TextField('name', 50, false)
	);

	JSORM.CreateTables(Duck);


	//
	// now get the row at ID=1 in the duck table
	//
	Duck.data.where({ id: 1 },
		function(data) {
			//
			// success, data should be the row data
			//
			if(data !== null) {
				console.log('The number of items I found is ');
				console.log(data.length);

				if(data.length > 0) {
					console.log('I found a thing');

					data = data[0];
					console.log(data.name);
					data.name = 'This is a new thing modified booa';

					data.save(function() {
						console.log('saved booa');
					}, function(error) {
						console.log(error.message);
					});
				}
				
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
	Duck.data.where( { id__lessthan: 5 }, function(data) {
		console.log('Number of items received: ' + data.length );
	});


	//
	// test to get all items with a name of adam
	//
	Duck.data.where( { name__contains: 'booa' }, function(data) {
		console.log('Number of items received for booa: ' + data.length );

		console.log('removing item');
		if(data.length !== 0) {
			data[0].remove(function() {
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
	var newThing = Duck.data.create();
	newThing.name = 'test insert';
	newThing.save(function(data) {
		console.log('inserted ' + newThing.id);
	});
}


var ducks = new Tests();