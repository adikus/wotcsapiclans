var cls = require("./lib/class"),
    _ = require("underscore"),
    Clan = require("./clan"),
    Thread = require("./thread");

module.exports = app = cls.Class.extend({
	init: function(miliseconds){
		console.log('Initialising app');
		
		this.idList = [];
		this.threads = [];
		ClanDB.update({},{$set:{locked:0}},{multi:true},function(){console.log("Unlocked all.");});
		this.loadClansFromDB();
	},
	
	onClansReady: function(callback) {
		this.clans_ready_callback = callback;
	},
	
	loadClansFromDB: function() {
		var self = this;
	
		ClanDB.find({locked: {$not: {$gte:1} } }).limit(10-this.idList.length).sort('updated_at').select('wid locked updated_at').exec(function(err, docs){
			if(docs.length == 0 && self.clans_ready_callback){
				self.clans_ready_callback();
				delete self.clans_ready_callback;
			}
			for(var i in docs){
				var wid = docs[i].wid,
					now = new Date();
				
				if(docs[i].updated_at.getTime() + 20000 < now.getTime()){
					self.idList.push(wid);
					docs[i].locked = 1;
					docs[i].save(function(){
						//console.log('Locked '+wid);
						if(self.clans_ready_callback){
							self.clans_ready_callback();
							delete self.clans_ready_callback;
						}
					});
				}
			}
			if(self.idList.length == 0){
				if(self.clans_ready_callback){
					self.clans_ready_callback();
					delete self.clans_ready_callback;
				}
			}
		});
	},
	
	addThread: function(callback) {
		var clan = this.shiftClan(),
			thread = new Thread(clan),
			self = this;
			
		thread.onDone(function(){
			//console.log(self.idList);
			self.loadClansFromDB();
			return self.shiftClan();
		});
		thread.onTimeout(function(wid) {
			var clan = self.shiftClan();
			if(wid)self.idList.unshift(wid);
			return clan;
		});
		thread.start();
		this.threads.push(thread);
	},
	
	shiftClan: function() {
		var wid = this.idList.shift(),
			clan = new Clan(wid);		
		if(wid)return clan;
			else return false;		
	},
	
	globalStatus: function(options) {		
		var self = this,
			wait_callback = null,
			time = new Date();
			
		time.setTime(time.getTime()-20000);
			
		ClanDB.count({updated_at:{$gt:time}},function(err, count){
			var ret = {loading: self.idList};
			ret.updated = count;
			ClanDB.count({},function(err,count){
				ret.total = count;
				wait_callback(ret);
			});			
		});
		
		return function(callback) {
			wait_callback = callback;
		}
	},
	
	status: function(options) {
		var self = this,
			wid = options[0],
			wait_callback = null;
			
		ClanDB.findOne({wid: wid},function(err,doc){
			if(doc)wait_callback(doc);
			else {
				clan = new ClanDB();
				clan.wid = wid;
				clan.status = "Not loaded.";
				clan.locked = 0;
				clan.updated_at = 0;
				clan.save();
				wait_callback(clan);
			}
		});
		
		return function(callback) {
			wait_callback = callback;
		}
	},
});