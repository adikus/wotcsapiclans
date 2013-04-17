var mongoose = require('mongoose'),
    Config = require("./config");

var oldDB = mongoose.createConnection(process.env.MONGOHQ_URL || Config.defaultMongo);
var playerDB = mongoose.createConnection(process.env.WOTCS_PLAYERDB);
var clanDB = mongoose.createConnection(process.env.WOTCS_CLANDB);

var oldClanSchema = mongoose.Schema({
	name: 'string',
	tag: 'string',
	description: '',
	motto: 'string',
	wid: {type:'number',index: {unique: true, dropDups: true}},
	region: 'number',
	status: 'string',
	locked: 'number',
	members: 'mixed',
	updated_at: 'date',
	players_updated_at: 'date'
});
var OldClan = oldDB.model('Clan', oldClanSchema);

var clanSchema = mongoose.Schema({ 
	_id: 'number',
	n: 'string',
	t: 'string',
	d: 'string',
	m: 'string',
	s: 'string',
	ms: 'mixed',
	u: 'date'
});
var Clan = clanDB.model('Clan', clanSchema);

var clanStatsSchema = mongoose.Schema({ 
	_id: 'number',
	value: 'mixed'
});
var OldClanStats = oldDB.model('ClanStats', clanStatsSchema, 'clan_stats');

var playerSchema = mongoose.Schema({
	wid: {type:'string',index: {unique: true, dropDups: true}},
	name: 'string',
	status: 'string',
	locked: 'number',
	clan_id: 'string',
	stats_current: 'mixed',
	updated_at: 'date'
});
var OldPlayerDB = oldDB.model('Player', playerSchema);

var newPlayerSchema = mongoose.Schema({
	_id: 'number',
	n: 'string',
	s: 'number',
	c: 'number',
	sc: 'mixed',
	v: 'mixed',
	u: 'date'
});
var Player = playerDB.model('Player', newPlayerSchema);

var oldMemberChangeSchema = mongoose.Schema({
	clan: { type: mongoose.Schema.Types.ObjectId, ref: 'Clan' },
	player_id: 'string',
	change: 'number',
	updated_at: 'date'
});
var OldMemberChange = oldDB.model('MemberChange', oldMemberChangeSchema);

var memberChangeSchema = mongoose.Schema({
	c: 'number',
	p: 'number',
	ch: 'number',
	u: 'date'
});
var MemberChange = clanDB.model('MemberChange', memberChangeSchema);

module.exports = DBTypes = {
	OldClan: OldClan,
	OldPlayer: OldPlayerDB,
	OldMemberChange: OldMemberChange,
	OldClanStats: OldClanStats,
	Clan: Clan,
	Player: Player,
	MemberChange: MemberChange,
};