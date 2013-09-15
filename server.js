var cls = require("./lib/class");
var  _ = require("underscore");
var http = require("http");

module.exports = cls.Class.extend({
	init: function(app){
        "use strict";

        this.app = app;

		var self = this;
		
		this.server = http.createServer(function (request, response) {

            var data = '';
		    request.on('data', function(chunk) {
				data += chunk.toString('utf8');
		    });
		    
		    request.on('end', function(chunk) {
		    	if(chunk)data += chunk.toString('utf8');
		    	
		    	self.app.router.route(request.url, data, function(status, data) {
                    response.writeHead(status, {
                        'Content-Type': 'text/plain',
                        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                        'Access-Control-Allow-Credentials': true,
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type, *'
                    });

                    response.end(JSON.stringify(data, null, "\t"));
                });
		    });
		});
	},

    listen: function(port) {
        this.server.listen(port);
        console.log('Server listening on port '+port+'.');
    }
});