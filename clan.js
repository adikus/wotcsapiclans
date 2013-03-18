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
		
		if(!this.doc || this.doc.wid != this.wid){
			
			DBTypes.Clan.findOne({wid:self.wid},function(err, doc){
				if(!doc){
					DBTypes.Clan.collection.findOne({wid:self.wid.toString()},{_id:true},function(err, doc){
						if(!doc){
							self.doc = new DBTypes.Clan();
							self.doc.wid = self.wid;
							callback(err);
						}
						else {
							DBTypes.Clan.collection.update({_id:doc._id},{$set:{wid:self.wid,locked:0}},function(err, doc){
								callback({msg:"WIDchange"});
							});
						}
					});
				}
				else{
					self.doc = doc;
					self.doc.wid = self.wid;
					callback(err);
				}
			});
		} else callback();
	},
	
	parseData: function(data){
		
	    try{
	        clanData = JSON.parse(data);
	    }catch(e){
	        console.log(e);
	        return false;
	    }
		
		if(clanData.status == "error"){
			this.doc.status = clanData.error;
			this.doc.tag = "";
			this.doc.name = "";
			this.doc.motto = "";
			this.doc.description = "";
			this.doc.members_count = 0;
		}
		else {
			this.doc.tag = clanData.data.abbreviation;
			this.doc.name = clanData.data.name;
			this.doc.status = 'Loaded';
			this.doc.motto = clanData.data.motto;
			this.doc.description = clanData.data.description_html;
			this.doc.members_count = clanData.data.members_count;
			this.members_count = clanData.data.members_count;
			for(i in clanData.data.members){
				pid = clanData.data.members[i].account_id;
				this.memberIds.push(pid);
			}
			this.memberIds = _.map(this.memberIds,function(wid){
				return wid.toString();
			});
			if(this.doc.members){
				if(typeof this.doc.members[0] !== 'string'){
					console.log("Creating new member changes for clan "+this.wid);
					this.doc.members = this.createMemberChangesFromOld();
				}
				
				var self = this;
				_.each(this.doc.members,function(wid){
					if(!_.contains(self.memberIds,wid)){
						var mc = new DBTypes.MemberChange({
							clan: self.doc,
							player_id: wid,
							change: -1,
							updated_at: new Date()
						});
						mc.save();
					}
				});
				_.each(this.memberIds,function(wid){
					if(!_.contains(self.doc.members,wid)){
						var mc = new DBTypes.MemberChange({
							clan: self.doc,
							player_id: wid,
							change: 1,
							updated_at: new Date()
						});
						mc.save();
					}
				});
			}
			this.doc.members = this.memberIds;
			this.doc.markModified('members');
		}
		this.doc.locked = 0;
		this.doc.updated_at = new Date();
    	return true;
  	},
  	
  	createMemberChangesFromOld: function() {
  		for(var i=1;i<this.doc.members.length;i++){
  			for(var j=0;j<this.doc.members[i].changes.length;j++){
  				var mc = new DBTypes.MemberChange({
  					clan: this.doc,
  					player_id: this.doc.members[i].changes[j].slice(1),
  					change: this.doc.members[i].changes[j][0] == "+"?1:-1,
  					updated_at: new Date(this.doc.members[i].updated_at)
  				});
  				mc.save();
  			}
  		}
  		return this.doc.members[0];
  	},
	
	save: function(callback) {
		//console.log('Unlocked '+this.wid);
		this.doc.save(function(err){callback(err);});
	},
	
	getData: function(){
		var ret = {};
		
		ret.tag = this.doc.tag;
		ret.name = this.doc.name;
		ret.motto = this.doc.motto;
		ret.description = this.doc.description;
		ret.members = this.doc.members;
		ret.updated_at = this.doc.updated_at;
		ret.players_updated_at = this.doc.players_updated_at;
		
		return ret;
	},
	
	getChanges: function(callback) {
		DBTypes.MemberChange.find({clan:this.doc._id}).sort("updated_at").exec(function(err,docs){
			var ret = {status: "ok"};
			var wids = _.map(docs,function(change){return change.player_id;});
			var names = {};
			
			DBTypes.Player.find({wid:{$in:wids}}).select("wid name").exec(function(err, players){
				_.each(players,function(player){names[player.wid] = player.name});
				ret.changes = _.map(docs,function(change){
					return {
						player: change.player_id,
						change: change.change,
						name: names[change.player_id]?names[change.player_id]:"",
						updated_at: change.updated_at
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