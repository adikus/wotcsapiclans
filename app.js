var cls = require("./lib/class"),
    _ = require("underscore"),
    Clan = require("./clan"),
    Thread = require("./thread"),
    DBTypes = require("./db_types"),
    Config = require("./config");

module.exports = app = cls.Class.extend({
	init: function(){
		console.log('Initialising app');
		
		this.idList = [];
		this.threads = [];
		DBTypes.Clan.update({},{$set:{locked:0}},{multi:true},function(){console.log("Unlocked all.");});
		this.loadClansFromDB();
	},
	
	onClansReady: function(callback) {
		this.clans_ready_callback = callback;
	},
	
	loadClansFromDB: function() {
		var self = this;
	
		DBTypes.Clan.find({locked: {$not: {$gte:1} } }).limit(10).sort('updated_at').select('wid locked updated_at').exec(function(err, docs){
			if(docs.length == 0 && self.clans_ready_callback){
				self.clans_ready_callback();
				delete self.clans_ready_callback;
			}
			for(var i in docs){
				var wid = docs[i].wid,
					now = new Date();
				
				if(docs[i].updated_at.getTime() + Config.clanUpdateInterval < now.getTime() && self.idList.length < 10){
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
			
		time.setTime(time.getTime()-60000);
			
		DBTypes.Clan.count({updated_at:{$gt:time}},function(err, count){
			var ret = {id_list: self.idList,threads: self.threadInfo()};
			ret["updated1m"] = count;
			time.setTime(time.getTime()+60000-3600000);
			DBTypes.Clan.count({updated_at:{$gt:time}},function(err, count){
				ret["updated1h"] = count;
				DBTypes.Clan.count({},function(err,count){
					ret.total = count;
					wait_callback(ret);
				});			
			});		
		});
		
		return function(callback) {
			wait_callback = callback;
		}
	},
	
	threadInfo: function(){
		var ret = [];
		_.each(this.threads,function(thread){
			var retT = {inactive:thread.timeInactive};
			if(thread.clan){
				retT.name = thread.clan.doc?thread.clan.doc.name:"Loading...";
				retT.wid = thread.clan.wid;
				ret.push(retT);
			}
		});
		return ret;
	},
	
	status: function(options) {
		var self = this,
			wid = parseInt(options[0]),
			wait_callback = null;
			
		DBTypes.Clan.findOne({wid: wid},function(err,doc){
			if(doc){
				clan = new Clan(wid);
				clan.doc = doc;
			}
			else {
				doc = new DBTypes.Clan();
				doc.wid = wid;
				doc.status = "Not loaded.";
				doc.locked = 0;
				doc.updated_at = 0;
				doc.save();
				var clan = new Clan(wid);
				clan.doc = doc;
			}
			wait_callback(clan.getData());
		});
		
		return function(callback) {
			wait_callback = callback;
		}
	},
	
	changes: function(options) {
		var self = this,
			wid = parseInt(options[0]),
			wait_callback = null;
			
		DBTypes.Clan.findOne({wid: wid}).select("wid").exec(function(err,doc){
			if(doc){
				clan = new Clan(wid);
				clan.doc = doc;
			}
			clan.getChanges(wait_callback);
		});
		
		return function(callback) {
			wait_callback = callback;
		}
	},
	
	list: function(options) {
		var self = this,
			region = options[0]?parseInt(options[0]):-1,
			skip = options[1]?parseInt(options[1])*30:0,
			wait_callback = null;
			
		var cond = {};	
		switch(region){
			case 0:
				cond = {wid:{$gt:0,$lt:500000000}};
				break;
			case 1:
				cond = {wid:{$gt:500000000,$lt:1000000000}};
				break;
			case 2:
				cond = {wid:{$gt:1000000000,$lt:2500000000}};
				break;
			case 4:
				cond = {wid:{$gt:2500000000,$lt:9900000000}};
				break;
		}
		
		DBTypes.Clan.count(cond).exec(function(err,count){
			DBTypes.Clan.find(cond).select("wid tag").sort("tag").limit(30).skip(skip).exec(function(err,docs){
				var ret = {status:"ok",count:count,list:[]};
				_.each(docs,function(clan){
					ret.list.push({tag:clan.tag,wid:clan.wid});
				});
				wait_callback(ret);
			});
		});
		
		return function(callback) {
			wait_callback = callback;
		}
	},
	
	score: function(options) {
		var self = this,
			wait_callback = null,
			wid = parseInt(options[0]);
		
		return function(callback) {
			wait_callback = callback;

			DBTypes.ClanStats.findOne({_id:wid}).exec(function(err, doc){
				var ret = {
					status: "ok",
					score: doc.value
				}
				wait_callback(ret);
			});
		}
	},
	
	scores: function(options) {
		var self = this,
			wait_callback = null,
			region = options[0]?parseInt(options[0]):-1,
			from = options[1]?parseInt(options[1])*30:0;
		
		return function(callback) {
			wait_callback = callback;

			var cond = {};
			switch(region){
			case 0:
				cond._id = {$lt:500000000,$gt:0};
				break;
			case 1:
				cond._id = {$lt:1000000000,$gt:500000000};
				break;
			case 2:
				cond._id = {$lt:2500000000,$gt:1000000000};
				break;
			case 4:
				cond._id = {$gt:2500000000};
				break;
			}
			
			DBTypes.ClanStats.find(cond).sort("-value.SC3").skip(from).limit(30).exec(function(err, docs){
				var ret = {
					status: "ok",
					scores: []
				}
				var wids = _.map(docs,function(doc){return doc._id;}),
					clans = docs;
				DBTypes.Clan.find({wid:{$in:wids}}).select("wid tag").exec(function(err,docs){
					var names = {};
					_.each(docs,function(doc){names[doc.wid] = doc.tag;});
					
					_.each(clans,function(doc){
						var retDoc = doc.value;
						retDoc.wid = doc._id;
						retDoc.tag = names[doc._id]?names[doc._id]:"";
						ret.scores.push(retDoc);
					});
					
					wait_callback(ret);
				});
			});
		}
	},
});