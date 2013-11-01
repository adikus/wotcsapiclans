var mongoose = require('mongoose'),
	cls = require("./lib/class"),
    _ = require("underscore"),
    DBTypes = require("./db_types");

module.exports = Clan = cls.Class.extend({
	init: function(wid){
		this.wid = parseInt(wid);
		this.memberIds = [];
		this.done = 0;
	},
	
	find: function(callback){
		var self = this;
		
		if(!this.doc || this.doc._id != this.wid){
			
			DBTypes.Clan.findOne({_id:self.wid},function(err, doc){
				if(!doc){
					self.doc = new DBTypes.Clan();
					self.doc._id = self.wid;
					callback(err);
				}
				else{
					self.doc = doc;
					callback(err);
				}
			});
		} else callback();
	},
	
	parseData: function(data){
		var self = this;
		
	    try{
	        var clanData = JSON.parse(data);
            clanData.data = clanData.data[this.wid];
	    }catch(e){
	        //console.log(e);
	        return false;
	    }
		
		if(clanData.status == "error" || !clanData.data){
			this.doc.s = clanData.error || 'Unknown error';
			/*this.doc.t = "";
			this.doc.n = "";
			this.doc.m = "";
			this.doc.d = "";
			this.members_count = 0;*/
		}
		else {
			this.doc.t = clanData.data.abbreviation;
			this.doc.n = clanData.data.name;
			this.doc.s = 1;
			this.doc.m = clanData.data.motto;
			this.doc.d = clanData.data.description_html;
			this.members_count = clanData.data.members_count;
			for(i in clanData.data.members){
				pid = clanData.data.members[i].account_id;
				this.memberIds.push(pid);
			}
			this.memberIds = _.map(this.memberIds,function(wid){
				return parseInt(wid);
			});
			this.doc.ms = _.map(this.doc.ms,function(wid){
				return parseInt(wid);
			});
			if(this.doc.ms){
				_.each(this.doc.ms,function(wid){
					if(!_.contains(self.memberIds,wid)){
						var mc = new DBTypes.MemberChange({
							c: self.wid,
							p: wid,
							ch: -1,
							u: new Date()
						});
                        self.saveMC(mc);
						self.updatePlayer(wid,0);
					}
				});
				_.each(this.memberIds,function(wid){
					if(!_.contains(self.doc.ms,wid)){
						var mc = new DBTypes.MemberChange({
							c: self.wid,
							p: wid,
							ch: 1,
							u: new Date()
						});
                        self.saveMC(mc);
						self.updatePlayer(wid,self.wid);
					}
				});
			}else{
				_.each(self.memberIds,function(wid){
					self.checkIfNew(wid);
				});
			}
			this.doc.ms = this.memberIds;
			this.doc.markModified('ms');
		}
		this.doc.u = new Date();
    	return true;
  	},

    saveMC: function(mc) {
        DBTypes.MemberChange.findOne({c:mc.c, p:mc.p},function(err, doc){
            if(doc){
                var days = (mc.u.getTime() - doc.u.getTime())/(1000*3600*24);
                if(days > 3){
                    mc.save();
                }else{
                    console.log('Member change already exists for player:',mc.p);
                }
            }else{
                mc.save();
            }
        });
    },
  	
  	updatePlayer: function(wid,clan) {
  		var self = this;
  		DBTypes.Player.findOne({_id:wid},function(err, doc){
			if(!doc){
				doc = new DBTypes.Player();
				doc._id = wid;
				doc.s = "0";
				doc.c = clan;
				doc.save(function(err){
					if(err)console.log(err,"Player");
					else console.log("New player created: "+wid+" (clan: "+clan+")");
				});
			}else{
				var prev = doc.c;
				doc.c = clan;
				doc.save(function(err){
					if(err)console.log(err,"Player");
					else console.log("Player updated: "+wid+" (clan: "+prev+"->"+clan+")");
				});
			}
		});
  	},
	
	save: function(callback) {
		this.doc.save(function(err){callback(err);});
	},
	
	getData: function(){
		var ret = {};
		
		ret.tag = this.doc.t;
		ret.name = this.doc.n;
		ret.motto = this.doc.m;
		ret.description = this.doc.d;
		ret.members = this.doc.ms;
		ret.clan_status = this.doc.s;
		ret.updated_at = this.doc.u;
		ret.status = "ok";
		
		return ret;
	},
	
	getChanges: function(callback) {
		DBTypes.MemberChange.find({c:this.wid}).sort("u").exec(function(err,docs){
			var ret = {status: "ok"};
			var wids = _.map(docs,function(change){return change.p;});
			var names = {};
			
			DBTypes.Player.find({_id:{$in:wids}}).select("_id n").exec(function(err, players){
				_.each(players,function(player){names[player._id] = player.n});
				ret.changes = _.map(docs,function(change){
					return {
						player: change.p,
						change: change.ch,
						name: names[change.p]?names[change.p]:"",
						updated_at: change.u
					};
				});
				callback(ret);
			});
		});
	},
	
	getUpdatedAt: function() {
		return this.doc.updated_at?this.doc.updated_at.getTime():0;
	}
});