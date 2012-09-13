 

var JSORM = {
	Initialised: false,

	Database: function(initialiser) {
		this.config = initialiser;
		var self = this;
		
		this.createDatabase = function() {

		};

		this.openDatabase = function() {
			self.DB = window.openDatabase(
				self.config.name,
				self.config.version,
				self.config.title,
				self.config.bytes,
				self.createDatabase);
			return self.DB;
		};

		if(!JSORM.Initialised) {
			JSORM.Model.prototype.manager = JSORM.manager;
			JSORM.LiveObject.prototype.save = JSORM.Save;
			JSORM.LiveObject.prototype.remove = JSORM.Remove;
		}
	},




	FieldTypes: {
		BitField: function(name, nullable) {
			this.name = name;
			this.nullable = nullable;
		},

		IntegerField: function(name, nullable) {
			this.name = name;
			this.nullable = nullable;
		},

		DateField: function(name, nullable) {
			this.name = name;
			this.nullable = nullable;
		},

		TextField: function(name, size, nullable) {
			this.name = name;
			this.size = size;
			this.nullable = nullable;
		},

		ForeignKeyField: function(name, newModel, newField) {
			this.name = name;
			this.newModel = newModel;
			this.newField = newField;
		}
	},




	manager: {
		create: function() {
			var data = {};
			this.model.attachedFields.forEach(
				function(__loopField) {
					data[__loopField.name] = null;
				}
			);

			var result = new JSORM.LiveObject(data);
			result.model = this.model;

			return result;
		},


		buildSelect: function(criteria) {
			var sqlScript = [];
			var queryParams = [];
			var model = this.model;
			
			sqlScript.push('SELECT ');

			for(var fieldIndex = 0; fieldIndex < model.attachedFields.length; fieldIndex++) {
				if(fieldIndex > 0) {
					sqlScript.push(', ');
				}
				sqlScript.push('[' + model.attachedFields[fieldIndex].name + ']');
			}

			sqlScript.push(' FROM [' + model.config.name + ']');

			if(criteria ) {
				sqlScript.push(' WHERE ');

				var operator;
				var fieldName;
				var value;

				for(var criteriaItem in criteria) {
					fieldName = criteriaItem;
					operator = '=';
					value = criteria[criteriaItem];
					//
					// double underscores are control codes to modify the operator.
					// Use them after the fieldname to modify how you want to retrieve the data.
					//
					// options are:  lessthan, greaterthan, not, contains
					//
					// example:    id__lessthan: 5
					//
					// or: name__contains: 'fred'
					//
					if(criteriaItem.indexOf('__') != -1) {
						switch(criteriaItem.split('__')[1].toLowerCase()) {
							case 'lessthan':
								operator = '<';
								break;

							case 'greaterthan':
								operator = '>';
								break;

							case 'not':
								operator = '<>';
								break;

							case 'contains':
								operator = ' like ';
								value = '%' + value + '%';
								break;

						}

						fieldName = fieldName.split('__')[0];
					}

					sqlScript.push('[' + fieldName + ']' + operator + '?');
					queryParams.push(value);
				}
			}
			return [sqlScript.join(' '), queryParams];
		},


		get: function(criteria, successCallback, failureCallback) {
			var model = this.model;
			var buildSelect = model.manager.buildSelect(criteria);
			var commandToExecute = buildSelect[0];
			var queryParams = buildSelect[1];
			var result = null;
		
			model.database.transaction( function(tx) {
				console.log(commandToExecute);
				console.log(queryParams);

				tx.executeSql(
					commandToExecute,
					queryParams,
					function(t, data) {
						if(data.rows.length == 1) {
							result = new JSORM.LiveObject(data.rows.item(0));
							result.model = model;
						}
						if(data.rows.length > 1) {
							throw new Exception('Query returned more than one result');
						}
					},
					function(t, error) {
						
					}
				);
			}, function(a, error) {
				failureCallback(error);
			}, function() {
				successCallback(result);
			});
		},


		getAll: function(criteria, successCallback, failureCallback) {
			var model = this.model;
			var buildSelect = model.manager.buildSelect(criteria);
			var commandToExecute = buildSelect[0];
			var queryParams = buildSelect[1];
			var result = [];
			
		
			model.database.transaction( function(tx) {
				console.log(commandToExecute);
				console.log(queryParams);

				tx.executeSql(
					commandToExecute,
					queryParams,
					function(t, data) {
						for(var i = 0; i < data.rows.length; i++) {
							var newData = new JSORM.LiveObject(data.rows.item(i));
							newData.model = model;
							result.push(newData);
						}
					},
					function(t, error) {
						
					}
				);
			}, function(a, error) {
				failureCallback(error);
			}, function() {
				successCallback(result);
			});
		}
	},




	Model: function(database, name, config) {
		this.config = {
			name: name,
			id: 'id'
		};

		this.database = database;
		this.attachedFields = [];

		var model = this;
		this.attachField = function(item) {
			model.attachedFields.push(item);
		};


		if(config !== undefined) {
			this.config = config;
			this.config.name = name;
		} else {
			//
			// default to id
			//
			model.attachField(
				new JSORM.FieldTypes.IntegerField(model.config.id, false)
			);
		}

		this.manager.model = this;
	},



	LiveObject: function(data) {
		this.__original_data = data;

		for(var item in data) {
			this[item] = data[item];
		}
	},


	Remove: function(successCallback, failureCallback) {
		var sqlScript = [];
		var queryParams = [];
		var model = this.model;

		sqlScript.push('DELETE FROM [' + model.config.name + '] ' );
		sqlScript.push(' WHERE ');

		sqlScript.push('[' + model.config.id + ']=? ');
		queryParams.push(this[model.config.id]);

		var commandToExecute = sqlScript.join('');

		model.database.transaction( function(tx) {
			console.log(commandToExecute);
			console.log(queryParams);

			tx.executeSql(
				commandToExecute,
				queryParams,
				function(t, data) {
					if(data.rowsAffected == 1) {
						
					}
				},
				function(t, error) {
					
				}
			);
		}, function(a, error) {
			// transaction fail
			failureCallback(error);
		}, function() {
			// success
			successCallback();
		});
	},


	Save: function(successCallback, failureCallback) {
		var __changedFields = [];
		var sqlScript = [];
		var queryParams = [];
		var changed = false;
		var model = this.model;

		if(this[this.model.config.id] === null) {
			changed = true;
			//
			// INSERT
			//
			sqlScript.push('INSERT INTO [' + model.config.name + '] (' );
			//
			// fieldindex 0 is always the ID
			//
			for(var fieldIndex = 1; fieldIndex < model.attachedFields.length; fieldIndex++) {
				if(fieldIndex > 1) {
					sqlScript.push(', ');
				}
				sqlScript.push('[' + model.attachedFields[fieldIndex].name + ']');
			}
			sqlScript.push(') VALUES (');

			for(fieldIndex = 1; fieldIndex < model.attachedFields.length; fieldIndex++) {
				if(fieldIndex > 1) {
					sqlScript.push(', ');
				}
				sqlScript.push(' ? ');
				queryParams.push(this[model.attachedFields[fieldIndex].name]);
			}

			sqlScript.push(');');
		} else {
			//
			// UPDATE
			//
			sqlScript.push('UPDATE [' + model.config.name + '] SET ' );

			model.attachedFields.forEach(
				function(__loopField) {
					//
					// check if field has changed
					//
					if(this[__loopField.name] != this.__original_data[__loopField.name]) {
						sqlScript.push('[' + __loopField.name + ']=?');
						queryParams.push(this[__loopField.name]);
						changed = true;
					}
				}
			);

			sqlScript.push(' WHERE [' + model.config.id + ']=?');
			queryParams.push(this[model.config.id]);
		}
		//
		// nothing to save
		//
		if(!changed) {
			successCallback();
			return;
		}

		var commandToExecute = sqlScript.join('');

		model.database.transaction( function(tx) {
			console.log(commandToExecute);
			console.log(queryParams);

			tx.executeSql(
				commandToExecute,
				queryParams,
				function(t, data) {
					if(data.rowsAffected == 1) {
						if(data.insertId !== undefined) {
							this[model.config.id] = data.insertId;
						}
					}
				},
				function(t, error) {
					
				}
			);
		}, function(a, error) {
			failureCallback(error);
		}, function() {
			successCallback();
		});
	}
};
 


















var YayFun = function() {
	//
	// create a database connection
	//
	var database = new JSORM.Database({
		name: 'ducks',
		version: '1.0',
		title: 'wherearemyducks',
		bytes: '100000'
	});

	var db = database.openDatabase();


	//
	// now define the tables
	//
	var Duck = new JSORM.Model(db, 'ducks');
	//Duck.attachField(
	//	new JSORM.FieldTypes.IntegerField('id', false)
	//);
	Duck.attachField(
		new JSORM.FieldTypes.TextField('name', 50, false)
	);







	//
	// now get the row at ID=1 in the duck table
	//
	Duck.manager.get({ id: 6 },
		function(data) {
			//
			// success, data should be the row data
			//
			if(data !== null) {
				console.log(data.name);
				data.name = 'This is a new thing modified booa';

				data.save(function() {
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
	Duck.manager.getAll( { id__lessthan: 5 }, function(data) {
		console.log('Number of items received: ' + data.length );
	});

	//
	// test to get all items with a name of adam
	//
	Duck.manager.getAll( { name__contains: 'booa' }, function(data) {
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
	 

	console.log('testing insert');
	var newThing = Duck.manager.create();
	newThing.name = 'test insert';
	newThing.save(function(data) {
		console.log('inserted ' + newThing.id);
	});
 
 
};


var ducks = new YayFun();
