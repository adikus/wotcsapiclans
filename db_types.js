mongoose = require('mongoose');

var clanSchema = mongoose.Schema({ 
	name: 'string',
	tag: 'string',
	description: '',
	motto: 'string',
	wid: 'number',//{type:'number',index: {unique: true, dropDups: true}},
	region: 'number',
	status: 'string',
	locked: 'number',
	members: 'mixed',
	updated_at: 'date',
	players_updated_at: 'date'
});
var Clan = mongoose.model('Clan', clanSchema);

var clanStatsSchema = mongoose.Schema({ 
	_id: 'number',
	value: 'mixed'
});
var ClanStats = mongoose.model('ClanStats', clanStatsSchema, 'clan_stats');

var playerSchema = mongoose.Schema({
	wid: {type:'string',index: {unique: true, dropDups: true}},
	name: 'string',
	status: 'string',
	locked: 'number',
	clan_id: 'string',
	stats_current: 'mixed',
	updated_at: 'date'
});
var PlayerDB = mongoose.model('Player', playerSchema);

var memberChangeSchema = mongoose.Schema({
	clan: { type: mongoose.Schema.Types.ObjectId, ref: 'Clan' },
	player_id: 'string',
	change: 'number',
	updated_at: 'date'
});
var MemberChange = mongoose.model('MemberChange', memberChangeSchema);

module.exports = DBTypes = {
	Clan: Clan,
	Player: PlayerDB,
	MemberChange: MemberChange,
	ClanStats: ClanStats
};