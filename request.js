var cls = require("./lib/class"),
    _ = require("underscore"),
    http = require("http");

module.exports = Request = cls.Class.extend({
	init: function(host,method,id,api){
		this.data = '';
		
		var	self = this,
			options = {
				  host: host,
				  port: 80,
				  path: '/community/'+method+'/'+id+'/api/'+api+'/?source_token=WG-WoT_Assistant-1.3.2',
				  method: 'GET',
				};
		
		this.request = http.request(options, function(res) {
			var timeout = res.statusCode == 504;
			
			res.on('data', function (chunk) {
				if(!timeout)self.data += chunk.toString('utf8');
			});
			
			res.on('end', function (chunk) {
				if(!timeout){
					if(chunk)self.data += chunk.toString('utf8');
					self.success_callback(self.data);
				}else {
					self.timeout_callback();
				}
			});
		});

		this.request.on('error', function(e) {
			console.log('problem with request: ' + e.message);
		});

		this.request.end();
	},
	
	onSuccess: function(callback){
		this.success_callback = callback;
	},
	
	onTimeout: function(callback){
		this.timeout_callback = callback;
	}
});