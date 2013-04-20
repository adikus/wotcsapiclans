var mongoose = require('mongoose'),
    Config = require("./config");

var oldDB = mongoose.createConnection(process.env.MONGOHQ_URL || Config.defaultMongo);
var playerDB = mongoose.createConnection(process.env.WOTCS_PLAYERDB);
var clanDB = mongoose.createConnection(process.env.WOTCS_CLANDB);

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

var memberChangeSchema = mongoose.Schema({
	c: 'number',
	p: 'number',
	ch: 'number',
	u: 'date'
});
var MemberChange = clanDB.model('MemberChange', memberChangeSchema);

var statSchema = mongoose.Schema({
	_id: 'number',
	s: 'mixed',
	SC: 'number',
});
var Stat = oldDB.model('Stat', statSchema);


module.exports = DBTypes = {
	Clan: Clan,
	Player: Player,
	MemberChange: MemberChange,
	Stat: Stat,
};