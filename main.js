mongoose = require('mongoose')

function main(){
    var Server = require('./server'),
        App = require('./app'),
    	DBTypes = require("./db_types"),
    Config = require("./config");
        
    mongoose.connect(process.env.MONGOHQ_URL || Config.defaultMongo);
	
  	server = new Server(process.env.PORT || Config.defaultPort);
  	app = new App();
  	
  	app.onClansReady(function(){
		app.addThread();
		app.addThread();
		app.addThread();
		app.addThread();
	});	
  	
  	server.setRoute('status',function(options){
  		return app.globalStatus(options);
  	});
  	
  	server.setRoute('clan',function(options){
  		return app.status(options);
  	});

	server.setRoute('changes',function(options){
  		return app.changes(options);
  	});
  	
  	server.setRoute('score',function(options){
  		return app.score(options);
  	});
  	
  	server.setRoute('scores',function(options){
  		return app.scores(options);
  	});
  	
  	server.setRoute('list',function(options){
  		return app.list(options);
  	});
  	
  	server.setRoute('names',function(options){
  		return app.names(options);
  	});
}

main();