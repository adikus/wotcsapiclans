var mongoose = require('mongoose'),
	cls = require("./lib/class"),
    _ = require("underscore");
    
var clanSchema = mongoose.Schema({ 
	name: 'string',
	tag: 'string',
	description: '',
	motto: 'string',
	wid: 'string',
	region: 'number',
	status: 'string',
	locked: 'number',
	members: 'mixed',
	updated_at: 'date'
});
ClanDB = mongoose.model('Clan', clanSchema);

module.exports = Clan = cls.Class.extend({
	init: function(wid){
		this.wid = wid;
		this.memberIds = [];
		this.done = 0;
	},
	
	find: function(callback){
		var self = this;
		
		if(!this.db_model || this.db_model.wid != this.wid){
			
			ClanDB.findOne({wid:self.wid},function(err, clan_db){
				if(!clan_db)clan_db = new ClanDB();
				
				self.db_model = clan_db;
				self.db_model.wid = self.wid;
				callback(err);
			});
		} else callback(99);
	},
	
	parseData: function(data){
		
		clanData = JSON.parse(data);
		if(!clanData.status)console.log(data);
		if(clanData.status == "error"){
			this.db_model.status = clanData.error;
			this.db_model.tag = "";
			this.db_model.name = "";
			this.db_model.motto = "";
			this.db_model.description = "";
			this.db_model.members_count = 0;
		}
		else {
			this.db_model.tag = clanData.data.abbreviation;
			this.db_model.name = clanData.data.name;
			this.db_model.status = 'Loaded';
			this.db_model.motto = clanData.data.motto;
			this.db_model.description = clanData.data.description_html;
			this.db_model.members_count = clanData.data.members_count;
			this.members_count = clanData.data.members_count;
			for(i in clanData.data.members){
				pid = clanData.data.members[i].account_id;
				this.memberIds.push(pid);
			}
			this.memberIds = _.map(this.memberIds,function(wid){
				return wid.toString();
			});
			if(this.db_model.members[0].length > 0){
				var change = [],
					self = this;
				_.each(this.db_model.members[0],function(wid){
					if(!_.contains(self.memberIds,wid))change.push("-"+wid);
				});
				_.each(this.memberIds,function(wid){
					if(!_.contains(self.db_model.members[0],wid))change.push("+"+wid);
				});
				if(change.length > 0){
					var membersChange = {
						updated_at: Date.now(),
						changes: change
					};
					this.db_model.members.push(membersChange);
					this.db_model.members[0] = this.memberIds;
					this.db_model.markModified('members');
				}
			}else{
				this.db_model.members = [];
				this.db_model.members[0] = this.memberIds;
				this.db_model.markModified('members');
			}
		}
		this.db_model.locked = 0;
		this.db_model.updated_at = new Date();
	},
	
	save: function(callback) {
		//console.log('Unlocked '+this.wid);
		this.db_model.save(function(err){callback(err);});
	},
	
	getUpdatedAt: function() {
		return this.db_model.updated_at?this.db_model.updated_at.getTime():0;
	}
});