// tests
// require jQuery 
//
//
$('document').ready(function() {


	$('#frame1 #openDatabaseButton').click(function() {
		var databaseName = $('#databaseName').val();
		var databaseConnection = new JSORM.Database(databaseName, '1.0', databaseName, '100000');

		//
		// open database
		//
		window.db = databaseConnection.openDatabase();
		Master = new JSORM.Model(db, 'master');

		Master.data.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;",[], function(data) {
			$('#tableList li').each(function(index, element) {
				if(!$(element).hasClass('nav-header')) {
					$(element).remove();
				}
			});

			for(var loopIndex = 0; loopIndex < data.rows.length; loopIndex++){ 
				var tableName = data.rows.item(loopIndex).name;
				var listItem = $('<li />');
				$('#tableList').append(listItem);
				var a = $('<a>' + tableName + '</a>');
				listItem.append(a);
			}

			$('#tableList li a').click(function(item) {
				alert($(item.srcElement).text());
			});
			
		}, function(error) {
			alert(error);
		});


		return false;
	});
});

