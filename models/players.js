var cls = require("./../lib/class");
var BaseCollection = require('./base_collection');

module.exports = BaseCollection.extend({

    schema: {
        _id: 'number',
        n: 'string',
        s: 'number',
        c: 'number',
        sc: 'mixed',
        v: 'mixed',
        u: 'date'
    },

    name: 'Player',
    dbName: 'player'

});