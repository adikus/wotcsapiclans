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
}

main();