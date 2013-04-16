var cls = require("./lib/class"),
    _ = require("underscore"),
    Clan = require("./clan"),
    Request = require("./request");

module.exports = Thread = cls.Class.extend({
	init: function(clan, callback){
		this.clan = clan;
		this.id = 0;
		this.r = 0;
		this.active = new Date();
		if(callback)this.onDone(callback);
		
		var self = this;
		
		setInterval(function(){
			if(self.timeInactive() > 30000 && !self.t){
				console.log("Inactive: "+self.clan.wid);
				self.clan = self.timeout_callback(self.clan.wid);
				self.loadClan();
			}
		},5000);
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
	
	timeInactive: function(){
		var now = new Date();
		return now.getTime() - this.active.getTime();
	},
	
	loadClan: function() {
		var self = this;
		
		if(!this.clan){
			this.t = setTimeout(function(){
				self.t = false;
				self.clan = self.done_callback();
				self.loadClan();
			},1000);
			return false;
		}
		
		this.active = new Date()
		
		this.clan.find(function(err){
			
			if(err && err.msg == "WIDchange"){
				console.log("WID changed to number for clan "+self.clan.wid);
				self.clan = self.timeout_callback(self.clan.wid);
				self.loadClan();
				return false;
			}
			
			self.r++;
			
			var req = new Request('clans',self.clan.wid,'1.1');
			
			req.onSuccess(function(data){
				if(!self.clan.parseData(data)){
          			//console.log(data);
          			self.clan = self.timeout_callback(self.clan.wid);
					self.loadClan();
          			return false;  
        		}
				//console.log('Loaded: '+self.clan.wid);
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