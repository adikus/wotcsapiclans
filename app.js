var cls = require("./lib/class"),
    _ = require("underscore"),
    Clan = require("./clan"),
    DBTypes = require("./db_types"),
    ReqManager = require("./req_manager");

module.exports = cls.Class.extend({
	init: function(){
		console.log('Initialising app');
		
		this.clanList = [];
		this.pos = 0;
		this.loadQueue = [];
		this.loadingFromDB = false;
		this.retries = {};
		this.cycleDuration = "-";
		
		this.rm = new ReqManager();
		this.successCallbacks = {};
		
		var self = this;
		setInterval(function(){self.step();},1);
	},
	
	loadClansFromDB: function() { 
		this.retries = {};
		var self = this;
		this.loadingFromDB = true;
		
		if(this.startTime){
			var duration = Date.now() - this.startTime.getTime(),
				mins = Math.floor(duration/(60*1000)),
				secs = Math.round(duration/1000) % 60;
			this.cycleDuration = mins+"m"+secs+"s";
		}
		console.log('Loading clan list from DB...');
		DBTypes.Clan.find().sort('u').select('_id').exec(function(err, docs){
            console.log('Done loading clan list from DB.');
			var ids = [];
			_.each(docs,function(doc){
				if(doc._id){
					ids.push(doc._id);
					//self.loadQueue.push(doc._id);
				}
			});
			self.clanList = ids;
			self.loadingFromDB = false;
			self.startTime = new Date();
		});
	},

	loadClanFromAPI: function(clan, callback, preSaveCallback) {
        this.rm.addReq(null, 'clans.info', clan.wid,function(data){
            clan.find(function(){
                if(!clan.parseData(data)){
                    console.log('Parse error: '+clan.wid);
                    callback('Parse error', clan);
                }else{
                    if(preSaveCallback){
                        preSaveCallback(clan);
                    }
                    clan.save(function(err){
                        if(err){
                            console.log(err,"Clan");
                            callback('DB error', clan);
                        }
                        callback(null, clan);
                    });
                }
            });
        });
    },
	
	step: function() {
		var self = this;
		if(this.rm.queueLength() < 600 && self.loadQueue.length > 0){
			var clan = new Clan(self.loadQueue.shift());
			if(clan.wid < 2500000000 || clan.wid >= 3000000000){
				this.loadClanFromAPI(clan, function(err, clan) {
				    if(err){
                        self.retries[clan.wid] = self.retries[clan.wid]?self.retries[clan.wid]+1:1;
                        if(self.retries[clan.wid] < 3){
                            self.loadQueue.unshift(clan.wid);
                        }
                    } else {
                        if(self.retries[clan.wid]){
                            delete self.retries[clan.wid];
                        }
                    }
                }, function(clan) {
                    _.each(self.successCallbacks[clan.wid],function(s){
                        s(clan);
                    });
                    delete self.successCallbacks[clan.wid];
                });
			}
		}else if(self.loadQueue.length == 0 && !self.loadingFromDB){
			//this.loadClansFromDB();
		}
	},
	
	errors: function(options) {
		var s = options[0] || -1;
		
		return function(callback) {
			DBTypes.ErrorLog.find().sort("-t").skip(s>=0?s:0).limit(s>=0?1:1000).exec(function(err,docs){
				var ret = [];
				_.each(docs,function(doc){
					ret.push({e:doc.e.split("\n")[0],tr:doc.e.split("\n").slice(1),t:doc.t});
				});
				callback(ret);
			});
		};
	},
	
	globalStatus: function() {
		var self = this,
			wait_callback = null,
			time = new Date();
			
		time.setTime(time.getTime()-60000);
			
		DBTypes.Clan.count({u:{$gt:time}},function(err, count){
			var ret = {loader: self.rmInfo(),queue:self.loadQueue.length,last_cycle:self.cycleDuration};
			ret.request_manager = {
				queues: self.rm.queueLengths(),
				current: self.rm.getCurrentReqs(),
				failed: self.rm.getFailedLength(),
				waitTime: Math.round(self.rm.waitTime)
			};
			ret["updated1m"] = count;
			time.setTime(time.getTime()+60000-3600000);
			DBTypes.Clan.count({u:{$gt:time}},function(err, count){
				ret["updated1h"] = count;
				DBTypes.Clan.count({},function(err,count){
					ret.total = count;
					ret.retries = self.retries;
					wait_callback(ret);
				});
			});
		});
		
		return function(callback) {
			wait_callback = callback;
		};
	},
	
	rmInfo: function(){
		var ret = {};
		ret.speed = Math.round(this.rm.speed()*100)/100 + " req/s";
		ret.average_req_time = Math.round(this.rm.getAverageTime()*100)/100 + " ms";
		return ret;
	},
	
	addSuccessCallback: function(wid, callback){
		if(!this.successCallbacks[wid]){
			this.successCallbacks[wid] = [];
		}
		this.successCallbacks[wid].push(callback);
	},
	
	createAndWait: function(wid, callback){
		var doc = new DBTypes.Clan();
		doc._id = wid;
		doc.s = 0;
		doc.u = 0;
		doc.save();
		this.loadQueue.unshift(wid);
		this.clanList.push(wid);
		console.log("New clan created: "+wid);
		
		this.addSuccessCallback(wid,function(clan){
			callback(clan.getData());
		});
	},
	
	status: function(options) {
		var self = this,
			wid = parseInt(options[0], 10);
		if(isNaN(wid)){
			return {status:"error",error:"Bad clan id"};
		}
		return function(callback) {
			if(_.contains(self.clanList,wid)){
                DBTypes.Clan.findOne({_id: wid},function(err,doc){
					var clan;
                    if(doc){
						clan = new Clan(wid);
						clan.doc = doc;
						var now = new Date();
						if(now.getTime() - doc.u.getTime() < 1000 * 3600){
                            console.log('Loading ' + wid + ' from DB');
                            return callback(clan.getData());
                        }
					} else {
                        clan = new Clan(wid);
                    }
                    console.log('Loading ' + wid + ' from API');
                    self.loadClanFromAPI(clan, function(err, clan) {
                        callback(clan.getData());
                    });
				});
			}else{
				self.createAndWait(wid,callback);
			}
		};
	},
	
	playerChanges: function(options) {
		var wid = parseInt(options[0], 10),
			wait_callback = null;
			
		DBTypes.MemberChange.find({p: wid},function(err,docs){
			var idList = _.map(docs,function(change){return change.c;}),
				names = {},
				ret = {status: "ok"};
			DBTypes.Clan.find({_id:{$in:idList}},function(err,clans){
				_.each(clans,function(clan){names[clan._id] = {tag:clan.t,name:clan.n,wid:clan._id};});
				ret.changes = _.map(docs,function(change){
					return {
						change: change.ch,
						clan: names[change.c],
						updated_at: change.u
					};
				});
				wait_callback(ret);
			});
		});
		
		return function(callback) {
			wait_callback = callback;
		};
	},
	
	changes: function(options) {
		var wid = parseInt(options[0], 10);
		
		return function(callback) {
			DBTypes.Clan.findOne({_id: wid}).select("wid").exec(function(err,doc){
				if(doc){
					var clan = new Clan(wid);
					clan.doc = doc;
					clan.getChanges(callback);
				} else {
					callback({status:"Not found"});
				}
			});
		};
	},
	
	list: function(options) {
		var region = options["r"]?parseInt(options["r"], 10):-1,
			limit = options["l"]?parseInt(options["l"], 10):30,
			skip = options["s"]?parseInt(options["s"], 10)*limit:0;
		
		return function(callback) {
			var cond = {};	
			switch(region){
				case 0:
					cond = {_id:{$gt:0,$lt:500000000}};
					break;
				case 1:
					cond = {_id:{$gt:500000000,$lt:1000000000}};
					break;
				case 2:
					cond = {_id:{$gt:1000000000,$lt:2500000000}};
					break;
				case 3:
					cond = {_id:{$lt:2500000000,$gt:2000000000}};
					break;
				case 4:
					cond = {_id:{$gt:2500000000,$lt:3000000000}};
					break;
				case 5:
					cond = {_id:{$gt:3000000000,$lt:9900000000}};
					break;
			}
			cond.s = "1";
			
			DBTypes.Clan.count(cond).exec(function(err,count){
				DBTypes.Clan.find(cond).select("t").sort("t").limit(limit).skip(skip).exec(function(err,docs){
					var ret = {status:"ok",count:count,list:[]};
					_.each(docs,function(clan){
						ret.list.push({tag:clan.t,wid:clan._id});
					});
					callback(ret);
				});
			});
		};
	},
	
	score: function(options) {
		var wid = parseInt(options[0], 10);
		
		return function(callback) {
			DBTypes.OldClanStats.findOne({_id:wid}).exec(function(err, doc){
				var ret = {
					status: "ok",
					score: doc.value
				};
				callback(ret);
			});
		};
	},
	
	scores: function(options) {
		var region = options["r"]?parseInt(options["r"], 10):-1,
			limit = options["l"]?parseInt(options["l"], 10):10,
			skip = options["s"]?parseInt(options["s"], 10)*limit:0;
		
		return function(callback) {
			var cond = {};
			switch(region){
			case 0:
				cond._id = {$lt:500000000,$gt:0};
				break;
			case 1:
				cond._id = {$lt:1000000000,$gt:500000000};
				break;
			case 2:
				cond._id = {$lt:2000000000,$gt:1000000000};
				break;
			case 3:
				cond._id = {$lt:2500000000,$gt:2000000000};
				break;
			case 4:
				cond._id = {$lt:3000000000,$gt:2500000000};
				break;
			case 5:
				cond._id = {$gt:3000000000};
				break;
			}
			
			DBTypes.Stat.find(cond).select("_id SC").sort("-SC").skip(skip).limit(limit).exec(function(err, docs){
				var ret = {
					status: "ok",
					scores: []
				};
				var wids = _.map(docs,function(doc){return doc._id;}),
					clans = docs;
				DBTypes.Clan.find({_id:{$in:wids}}).select("t").exec(function(err,docs){
					var names = {};
					_.each(docs,function(doc){names[doc._id] = doc.t;});
					
					_.each(clans,function(doc){
						var retDoc = {SC3:doc.SC};
						retDoc.wid = doc._id;
						retDoc.tag = names[doc._id] || "";
						ret.scores.push(retDoc);
					});
					
					callback(ret);
				});
			});
		};
	}
});