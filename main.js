mongoose = require('mongoose')

function main(){
    var Server = require('./server'),
        App = require('./app'),
    	DBTypes = require("./db_types"),
    	Config = require("./config"),
    	Routes = require("./routes"),
    	_ = require("underscore");
	
  	server = new Server(process.env.PORT || Config.defaultPort);
  	app = new App();
	
	_.each(Routes,function(fName,route){
		server.setRoute(route,function(options){
	  		return app[fName](options);
	  	});
	});
	
	process.on('uncaughtException',function(E){
		e = new DBTypes.ErrorLog({e:E.stack,t:new Date()});
		e.save(function(){
			console.log(E);
			process.exit(1);
		});
	});
}

main();