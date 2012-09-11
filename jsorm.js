 

var JSORM = {
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
	},




	FieldTypes: {
		TextField: function(name, size, nullable) {
			this.name = name;
			this.size = size;
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

		ForeignKeyField: function(name, newModel, newField) {
			this.name = name;
			this.newModel = newModel;
			this.newField = newField;
		}
	},




	Model: function(database, name, config) {
		this.config = {
			name: name,
			id: 'id'
		};

		this.database = database;
		this.attachedFields = [];

		var modelThis = this;
		this.attachField = function(item) {
			modelThis.attachedFields.push(item);
		};


		if(config !== undefined) {
			this.config = config;
			this.config.name = name;
		} else {
			//
			// default to id
			//
			modelThis.attachField(
				new JSORM.FieldTypes.IntegerField(modelThis.config.id, false)
			);
		}

		
		this.LiveObject = function(data) {
			var liveObjectThis = this;
			this.__original_data = data;

			for(var item in data) {
				this[item] = data[item];
			}


			this.remove = function(successCallback, failureCallback) {
				var sqlScript = [];
				var queryParams = [];

				sqlScript.push('DELETE FROM [' + modelThis.config.name + '] ' );
				sqlScript.push(' WHERE ');

				sqlScript.push('[' + modelThis.config.id + ']=? ');
				queryParams.push(liveObjectThis[modelThis.config.id]);

				var commandToExecute = sqlScript.join('');

				modelThis.database.transaction( function(tx) {
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
			};


			this.save = function(successCallback, failureCallback) {
				var __changedFields = [];
				var sqlScript = [];
				var queryParams = [];
				var changed = false;

				if(liveObjectThis[modelThis.config.id] === null) {
					changed = true;
					//
					// INSERT
					//
					sqlScript.push('INSERT INTO [' + modelThis.config.name + '] (' );
					//
					// fieldindex 0 is always the ID
					//
					for(var fieldIndex = 1; fieldIndex < modelThis.attachedFields.length; fieldIndex++) {
						if(fieldIndex > 1) {
							sqlScript.push(', ');
						}
						sqlScript.push('[' + modelThis.attachedFields[fieldIndex].name + ']');
					}
					sqlScript.push(') VALUES (');

					for(fieldIndex = 1; fieldIndex < modelThis.attachedFields.length; fieldIndex++) {
						if(fieldIndex > 1) {
							sqlScript.push(', ');
						}
						sqlScript.push(' ? ');
						queryParams.push(liveObjectThis[modelThis.attachedFields[fieldIndex].name]);
					}
	
					sqlScript.push(');');
				} else {
					//
					// UPDATE
					//
					sqlScript.push('UPDATE [' + modelThis.config.name + '] SET ' );

					modelThis.attachedFields.forEach(
						function(__loopField) {
							//
							// check if field has changed
							//
							if(liveObjectThis[__loopField.name] != liveObjectThis.__original_data[__loopField.name]) {
								sqlScript.push('[' + __loopField.name + ']=?');
								queryParams.push(liveObjectThis[__loopField.name]);
								changed = true;
							}
						}
					);

					sqlScript.push(' WHERE [' + modelThis.config.id + ']=?');
					queryParams.push(liveObjectThis[modelThis.config.id]);
				}
				//
				// nothing to save
				//
				if(!changed) {
					successCallback();
					return;
				}

				var commandToExecute = sqlScript.join('');

				modelThis.database.transaction( function(tx) {
					console.log(commandToExecute);
					console.log(queryParams);

					tx.executeSql(
						commandToExecute,
						queryParams,
						function(t, data) {
							if(data.rowsAffected == 1) {
								if(data.insertId !== undefined) {
									liveObjectThis[modelThis.config.id] = data.insertId;
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
			};
		};


		this.manager = {
			create: function() {
				var data = {};
				modelThis.attachedFields.forEach(
					function(__loopField) {
						data[__loopField.name] = null;
					}
				);

				return new modelThis.LiveObject(data);
			},


			buildSelect: function(criteria) {
				var sqlScript = [];
				var queryParams = [];
				
				sqlScript.push('SELECT ');

				for(var fieldIndex = 0; fieldIndex < modelThis.attachedFields.length; fieldIndex++) {
					if(fieldIndex > 0) {
						sqlScript.push(', ');
					}
					sqlScript.push('[' + modelThis.attachedFields[fieldIndex].name + ']');
				}

				sqlScript.push(' FROM [' + modelThis.config.name + ']');

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
				var buildSelect = modelThis.manager.buildSelect(criteria);
				var commandToExecute = buildSelect[0];
				var queryParams = buildSelect[1];
				var result = null;
			
				modelThis.database.transaction( function(tx) {
					console.log(commandToExecute);
					console.log(queryParams);

					tx.executeSql(
						commandToExecute,
						queryParams,
						function(t, data) {
							if(data.rows.length == 1) {
								result = new modelThis.LiveObject(data.rows.item(0));
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
				var buildSelect = modelThis.manager.buildSelect(criteria);
				var commandToExecute = buildSelect[0];
				var queryParams = buildSelect[1];
				var result = [];
			
				modelThis.database.transaction( function(tx) {
					console.log(commandToExecute);
					console.log(queryParams);

					tx.executeSql(
						commandToExecute,
						queryParams,
						function(t, data) {
							for(var i = 0; i < data.rows.length; i++) {
								var newData = new modelThis.LiveObject(data.rows.item(i));
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
		};
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
				alert(data.name);


				data.name = 'This is a new thing modified booa';
				data.save(function() {
					alert('saved');
				}, function(error) {
					alert(error.message);
				});
			}
		}, function(error) {
			//
			// get failed
			//
			alert(error.message);
		}
	);





	//
	// test to get all items with an id below 5
	//
	Duck.manager.getAll( { id__lessthan: 5 }, function(data) {
		alert('Number of items received: ' + data.length );
	});

	//
	// test to get all items with a name of adam
	//
	Duck.manager.getAll( { name__contains: 'booa' }, function(data) {
		alert('Number of items received for booa: ' + data.length );

		alert('removing item');
		if(data.length !== 0) {
			data[0].remove(function() {
				// success
				alert('remove success');
			}, function() {
				//
				alert('remove fail');
			});
		}
		
	});
	 

	alert('testing insert');
	var newThing = Duck.manager.create();
	newThing.name = 'test insert';
	newThing.save(function(data) {
		alert('inserted ' + newThing.id);
	});
 
 
};


var ducks = new YayFun();