var cls = require("./../lib/class");
var BaseCollection = require('./base_collection');

module.exports = BaseCollection.extend({

    schema: {
        c: 'number',
        p: 'number',
        ch: 'number',
        u: 'date'
    },

    name: 'MemberChange',
    dbName: 'clan'

});