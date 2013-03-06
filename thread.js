var cls = require("./lib/class"),
    _ = require("underscore"),
    Clan = require("./clan"),
    Request = require("./request");

module.exports = Thread = cls.Class.extend({
	init: function(clan, callback){
		this.clan = clan;
		this.id = 0;
		this.r = 0;
		if(callback)this.onDone(callback);
	},
	
	start: function() {
		this.loadClan();
		console.log("Thread started.");
	},
	
	onDone: function(callback) {
		this.done_callback = callback;
	},
	
	onTimeout: function(callback) {
		this.timeout_callback = callback;
	},
	
	loadClan: function() {
		var self = this;
		
		if(!this.clan){
			setTimeout(function(){
				self.clan = self.done_callback();
				self.loadClan();
			},1000);
			return false;
		}
		
		this.clan.find(function(err){
			
			self.r++;
			
			req = new Request('clans',self.clan.wid,'1.1');
			
			req.onSuccess(function(data){
				self.clan.parseData(data);
				console.log('Loaded: '+self.clan.wid);
				self.clan.save(function(err){
					if(err)console.log(err);
					
					self.clan = self.done_callback();
					self.loadClan();
				});
			});
			
			req.onTimeout(function(){
				if(self.timeout_callback){
					console.log('Timeout: '+self.clan.wid);
					
					self.clan = self.timeout_callback(self.clan.wid);
					self.loadClan();
				}
			});
		});
	},
});