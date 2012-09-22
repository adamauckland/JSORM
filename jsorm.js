
(function(globals, console){
	"use strict";

	/**
	 * A JavaScript ORM for the Local Database storage.
	 * @type {Object}
	 */
	globals.JSORM = {
		/**
		 * Have we been initialised
		 * @type {Boolean}
		 */
		initialised: false,

		/**
		 * Has the database been created when we attempted to open it?
		 * Use this parameter to know if we need to create the tables.
		 * @type {Boolean}
		 */
		isNewDatabase: false,

		/**
		 * List of all declared model types
		 * @type {Array}
		 */
		modelTypes: [],


		/**
		 * [Error description]
		 * @param {String} message Text to output
		 */
		error: function(message) {
			console.log('ERROR. ' + message);
		},


		/**
		 * [Log description]
		 * @param {[type]} message [description]
		 */
		log: function(message) {
			console.log(message);
		},


		/**
		 * Return a new database connection
		 * @param {String} dbName    Name
		 * @param {Integer} dbVersion Version Number
		 * @param {String} dbTitle   Database Title
		 * @param {Integer} dbBytes   Max bytes to allocate for DB
		 */
		Database: function(dbName, dbVersion, dbTitle, dbBytes) {
			if(!JSORM.initialised) {

				JSORM.Model.prototype.attachField = function(item) {
					this.attachedFields.push(item);

					//
					// ForeignKey fields need to follow the model and return properties from the associated model
					//
					if(item instanceof JSORM.FieldTypes.ForeignKeyField){
						this.modelItemPrototype.__defineGetter__(item.name, function() {
							return this.__original_data[item.name];
						});
						this.modelItemPrototype.__defineSetter__(item.name, function(value) {
							this.__original_data[item.name] = value;
						});
					}
				};
				
				//
				// Tell the datarows to use the datarows prototype to give it all the SQL methods
				// Each method should return a datarows object fully loaded with goodies
				JSORM.DataRows.prototype = JSORM.DataRowsPrototype;
			}

			this.config = {
				name: dbName,
				version: dbVersion,
				title: dbTitle,
				bytes: dbBytes
			};
			var self = this;
			
			this.createDatabase = function() {
				console.log('No database');
				JSORM.isNewDatabase = true;
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


		/**
		 * [CreateTables Automated SQL to build all the tables for code-first ORM usage. NOT COMPLETED
		 * @param {[type]} model [description]
		 */
		CreateTables: function(model) {
			if (!JSORM.isNewDatabase) {
				JSORM.log('Not new database');
				return;
			}

			JSORM.log('This is a new database');

			JSORM.modelTypes.forEach(function(loopModelType) {
				JSORM.log('New model');
				JSORM.log(loopModelType);

				var sqlScript = [];
				sqlScript.push('CREATE TABLE [' + loopModelType.config.name + '] (');

				// push each field on
				for(var fieldIndex = 0; fieldIndex < loopModelType.attachedFields.length; fieldIndex++) {
					if(fieldIndex > 0) {
						sqlScript.push(', ');
					}
					sqlScript.push('[' + loopModelType.attachedFields[fieldIndex].name + '] ');

					var typeOfName = typeof(loopModelType.attachedFields[fieldIndex]);
					JSORM.log(typeOfName);

					switch (typeof(loopModelType.attachedFields[fieldIndex])) {


					}
				}

				sqlScript.push(');');
			});
		},


		/**
		 * Map model fields to the database fields
		 * @type {Object}
		 */
		FieldTypes: {
			/**
			 * Bit Field
			 * @param {String} name     Field name in table
			 * @param {Boolean} nullable Is field nullable or not?
			 */
			BitField: function(name, nullable) {
				this.name = name;
				this.nullable = nullable;
			},


			/**
			 * Integer Field
			 * @param {String} name     Field name in table
			 * @param {Boolean} nullable Is field nullable or not?
			 */
			IntegerField: function(name, nullable) {
				this.name = name;
				this.nullable = nullable;
			},


			/**
			 * Date Field
			 * @param {String} name     Field name in table
			 * @param {Boolean} nullable Is field nullable or not?
			 */
			DateField: function(name, nullable) {
				this.name = name;
				this.nullable = nullable;
			},


			/**
			 * Text Field
			 * @param {String} name     Field name in table
			 * @size {Integer} size		Max field size
			 * @param {Boolean} nullable Is field nullable or not?
			 */
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


		/**
		 * DataRows object. The DataRows object is an object which has all the SQL bits on it
		 * each function returns a DataRows object
		 *
		 * This is where we will store our data for chaining
		 * @type {namespace}
		 */
		DataRows: function() {
			this.__dataRows = [];
			this.__sqlScript = [];
			this.__queryParams = [];
		},


		/**
		 * DataRowsPrototype Put all the functions for the DataRows here
		 * @type {Object}
		 */
		DataRowsPrototype: {
			

			/**
			 * Create a new instance of the model
			 * @return {Parent Model Type}
			 */
			create: function() {
				var data = {};
				this.model.attachedFields.forEach(
					function(__loopField) {
						data[__loopField.name] = null;
					}
				);
				data[this.model.config.id] = null;

				var result = new this.model.ModelItem(data);
				result.model = this.model;

				return result;
			},


			/**
			 * Generate a SELECT statement to retrieve a model instance from the database
			 * @param  {[type]} criteria [description]
			 * @return {[type]}
			 */
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


			/**
			 * execute arbitrary SQL
			 * @param  {[type]} commandToExecute SQL. Use ? for parameters
			 * @param  {[type]} queryParams      Array containing the parameters for parameterising queries
			 * @param  {[type]} successCallback  Function to call on success
			 * @param  {[type]} failureCallback  Function to call on failure
			 * @return {dataset}                 Whatever comes out of the executeSql command
			 */
			execute: function(commandToExecute, queryParams, successCallback, failureCallback) {
				var model = this.model;
				var result = null;
			
				model.database.transaction( function(tx) {
					JSORM.log('Execute SQL: ' + commandToExecute);
					JSORM.log('With Params: ' + queryParams);

					tx.executeSql(
						commandToExecute,
						queryParams,
						function(t, data) {
							result = data;
						},
						function(t, error) {
							JSORM.error(error);
						}
					);
				}, function(a, error) {
					failureCallback(error);
				}, function() {
					successCallback(result);
				});
			},


			/**
			 * Get a single model instance from the database
			 * @param  {object} criteria        Field to value mapping for criteria
			 *
			 *  Double underscores are control codes to modify the operator.
			 *
			 *  Use them after the fieldname to modify how you want to retrieve the data.
			 *
			 *  options are:  lessthan, greaterthan, not, contains
			 *
			 *  example:    id__lessthan: 5
			 *
			 *  or: name__contains: 'fred'
			 * @param  {function} successCallback Function to call on success
			 * @param  {function} failureCallback Function to call on fail
			 * @return {Parent Model Type}
			 */
			get: function(criteria, successCallback, failureCallback) {
				var model = this.model;
				var buildSelect = model.data.buildSelect(criteria);
				var commandToExecute = buildSelect[0];
				var queryParams = buildSelect[1];
				var result = null;
			
				model.database.transaction( function(tx) {
					JSORM.log('Execute SQL: ' + commandToExecute);
					JSORM.log('With Params: ' + queryParams);

					tx.executeSql(
						commandToExecute,
						queryParams,
						function(t, data) {
							if(data.rows.length == 1) {
								result = new JSORM.ModelItem(data.rows.item(0));
								result.model = model;
							}
							if(data.rows.length > 1) {
								throw 'Query returned more than one result';
							}
						},
						function(t, error) {
							JSORM.error(error);
						}
					);
				}, function(a, error) {
					failureCallback(error);
				}, function() {
					successCallback(result);
				});
			},


			/**
			 * Get a list of model instances from the database
			 * @param  {object} criteria        Field to value mapping for criteria
			 *
			 *  Double underscores are control codes to modify the operator.
			 *
			 *  Use them after the fieldname to modify how you want to retrieve the data.
			 *
			 *  options are:  lessthan, greaterthan, not, contains
			 *
			 *  example:    id__lessthan: 5
			 *
			 *  or: name__contains: 'fred'
			 * @param  {function} successCallback Function to call on success
			 * @param  {function} failureCallback Function to call on fail
			 * @return {Parent Model Type}
			 */
			where: function(criteria, successCallback, failureCallback) {
				var model = this.model;
				var buildSelect = this.buildSelect(criteria);
				var commandToExecute = buildSelect[0];
				var queryParams = buildSelect[1];
				var result = [];
			
				model.database.transaction( function(tx) {
					JSORM.log('Execute SQL: ' + commandToExecute);
					JSORM.log('With Params: ' + queryParams);

					tx.executeSql(
						commandToExecute,
						queryParams,
						function(t, data) {
							for(var i = 0; i < data.rows.length; i++) {
								var newData = new model.ModelItem(data.rows.item(i));
								newData.model = model;
								result.push(newData);
							}
						},
						function(t, error) {
							JSORM.error(error);
						}
					);
				}, function(a, error) {
					failureCallback(error);
				}, function() {
					successCallback(result);
				});
			}
		},


		/**
		 * Create a new model definition for the database.
		 * @param {database} database A database connection from JSORM.Database.connect()
		 * @param {String} name     Tablename
		 * @param {Object} config   Optional object containing override values.
		 *  {
		 *		name: tablename
		 *		id: fieldname to use for the primary key
		 *  }
		 *
		 * Model.data.where()
		 */
		Model: function(database, name, config) {
			this.config = {
				name: name,
				id: 'id',
				table: name
			};

			this.database = database;
			this.attachedFields = [];
			//
			// New instance of the datarows. This will be empty, but allow the start of chaining.
			// NOTE: data should probably be a property which returns an Array of ModelItem objects rather
			// than the actual DataRow objects
			//
			this.__defineGetter__('data', function() {
				// empty datarows to start the chain
				var newDataRows = new JSORM.DataRows();
				newDataRows.model = this;
				return newDataRows;
			});
			
			//
			// We need to build our ModelItem object and a modelItemPrototype
			// This is basically a pseudo-type, which will be given the prototype of modelItemPrototype
			// which gets the getters and setters hooked up
			//
			this.ModelItem = function (data) {
				this.__original_data = data;

				for (var loopKey in data){
					this[loopKey] = data[loopKey];
				}
			};

			//
			// The prototype will get connected up with the getters and setters
			this.modelItemPrototype = {
				save: JSORM.save,
				remove: JSORM.remove
			};
			this.ModelItem.prototype = this.modelItemPrototype;

			if(config !== undefined) {
				this.config = config;
				//this.config.name = name;
			} else {
				//
				// default to id
				//
				this.attachField(
					new JSORM.FieldTypes.IntegerField(this.config.id, false)
				);
			}

			//
			// Add ourself to the global model list
			//
			JSORM.modelTypes[name] = this;
		},


		/**
		 * Remove the item from the database
		 * @param {Function} successCallback Function to call on success
		 * @param {Function} failureCallback Function to call on failure
		 */
		remove: function(successCallback, failureCallback) {
			var sqlScript = [];
			var queryParams = [];
			var model = this.model;

			sqlScript.push('DELETE FROM [' + model.config.name + '] ' );
			sqlScript.push(' WHERE ');

			sqlScript.push('[' + model.config.id + ']=? ');
			queryParams.push(this[model.config.id]);

			var commandToExecute = sqlScript.join('');

			model.database.transaction( function(tx) {
				JSORM.log('Execute SQL: ' + commandToExecute);
				JSORM.log('With Params: ' + queryParams);

				tx.executeSql(
					commandToExecute,
					queryParams,
					function(t, data) {
						if(data.rowsAffected == 1) {
							
						}
					},
					function(t, error) {
						JSORM.error(error);
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


		/**
		 * Save the data from the ModelItem instance back into the database
		 * @param {[type]} successCallback [description]
		 * @param {[type]} failureCallback [description]
		 */
		save: function(successCallback, failureCallback) {
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
				var self = this;

				model.attachedFields.forEach(
					function(__loopField) {
						//
						// check if field has changed
						//
						if(self[__loopField.name] != self.__original_data[__loopField.name]) {
							sqlScript.push('[' + __loopField.name + ']=?');
							queryParams.push(self[__loopField.name]);
							changed = true;
						}
					}
				);

				sqlScript.push(' WHERE [' + model.config.id + ']=?');
				queryParams.push(self[model.config.id]);
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
				JSORM.log('Execute SQL: ' + commandToExecute);
				JSORM.log('With Params: ' + queryParams);

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
						JSORM.error(error);
					}
				);
			}, function(a, error) {
				failureCallback(error);
			}, function() {
				successCallback();
			});
		}
	};

	var JSORM = globals.JSORM;
})(window, console);






