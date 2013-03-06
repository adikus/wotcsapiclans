mongoose = require('mongoose')

function main(){
    var Server = require('./server'),
        App = require('./app');
        
    mongoose.connect(process.env.MONGOHQ_URL || 'mongodb://localhost/wotcsapi');
	
  	server = new Server(process.env.PORT || 3001);
  	app = new App();
  	
  	app.onClansReady(function(){
		app.addThread();
		app.addThread();
		app.addThread();
		app.addThread();
	});	
  	
  	server.setRoute('status_global',function(options){
  		return app.globalStatus(options);
  	});
  	
  	server.setRoute('status',function(options){
  		return app.status(options);
  	});
}

main();