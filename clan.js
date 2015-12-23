var mongoose = require('mongoose'),
	cls = require("./lib/class"),
    _ = require("underscore"),
    DBTypes = require("./db_types");

module.exports = Clan = cls.Class.extend({
	init: function(wid){
		this.wid = parseInt(wid);
		this.members = {};
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
	        return false;
	    }
		
		if(clanData.status == "error" || !clanData.data){
			this.doc.s = clanData.error || 'Unknown error';
		}
		else {
			this.doc.t = clanData.data.tag;
			this.doc.n = clanData.data.name;
			this.doc.s = 1;
			this.doc.m = clanData.data.motto;
			this.doc.d = clanData.data.description_html;
			this.members_count = clanData.data.members_count;
			_(clanData.data.members).each(function(member){
				if(member){
					var pid = member.account_id;
					this.members[pid] = member.account_name;
				}
			}, this);

			var ids = _(_(this.members).keys()).map(function(val){return parseInt(val, 10)});

			DBTypes.Player.find({_id: {$in: ids}}, function(err, players) {
				if(players){
					var found = {};
					_(players).each(function(player) {
						found[player._id] = true;
						if(player.c != self.wid || player.n != self.members[player._id]){
							if(player.n != self.members[player._id]){
								console.log('Name change '+player.n+' -> '+self.members[player._id]);
								player.n = self.members[player._id];
							}
							player.c = self.wid;
							player.save(function(err) {
								if(err){
									console.log(err,"Player");
								}
							});
						}
					});
					_(self.members).each(function(member, id) {
						var id = parseInt(id, 10);
						if(!found[id]){
							var doc = new DBTypes.Player();
							doc._id = id;
							doc.c = self.wid;
							doc.n = member;
							doc.save(function(err){
								if(err){
									console.log(err,"Player");
								}
								else {
									console.log("New player created: "+member+"("+id+") (clan: "+self.wid+")");
								}
							});
						}
					});
				}
			});

            DBTypes.Player.find({_id: {$not: {$in: ids}}, c: this.wid}, function(err, players) {
                _(players).each(function(player) {
                    player.c = 0;
                    player.save(function(err){
                        if(err){
                            console.log(err,"Player");
                        }
                    });
                });
            });

			this.doc.ms = ids;
			this.doc.markModified('ms');
		}
		this.doc.u = new Date();
    	return true;
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
        var self = this;
		DBTypes.MemberChange.find({c:this.wid}).sort("u").exec(function(err,docs){
            var filteredChanges = self.filterChanges(docs);
			var ret = {status: "ok"};
			var wids = _.map(filteredChanges,function(change){return change.p;});
			var names = {};
			
			DBTypes.Player.find({_id:{$in:wids}}).select("_id n").exec(function(err, players){
				_.each(players,function(player){names[player._id] = player.n});
				ret.changes = _.map(filteredChanges.reverse(),function(change){
					return {
						player: change.p,
						change: change.ch,
						name: names[change.p] || "",
						updated_at: change.u
					};
				});
				callback(ret);
			});
		});
	},

    filterChanges: function(changes) {
        var ret = [];
        var playerChanges = {};
        _(changes).each(function(change){
            if(!playerChanges[change.p]){
                playerChanges[change.p] = [{u:change.u,ch:change.ch}];
                ret.push(change);
            }else{
                var last = _(playerChanges[change.p]).last();
                if(last.ch != change.ch){
                    playerChanges[change.p].push({u:change.u,ch:change.ch});
                    ret.push(change);
                }
            }
        });
        return ret.reverse();
    },
	
	getUpdatedAt: function() {
		return this.doc.updated_at?this.doc.updated_at.getTime():0;
	}
});