var cls = require("./../lib/class");
var BaseCollection = require('./base_collection');

module.exports = BaseCollection.extend({

    schema: {
        _id: 'number',
        n: 'string',
        t: 'string',
        d: 'string',
        m: 'string',
        s: 'string',
        e: 'string',
        ms: 'mixed',
        u: 'date'
    },

    name: 'Clan',
    dbName: 'clan'

});