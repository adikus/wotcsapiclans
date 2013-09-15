var cls = require("./../lib/class");
var _ = require('underscore');
var mongoose = require('mongoose');

BaseCollection = cls.Class.extend({

    init: function (databases, constructors) {
        this.db = databases[this.dbName].model(this.name, mongoose.Schema(this.schema));
        this.constructor = constructors[this.name];
    },

    find: function (conds) {
        if(!conds)conds = {};
        return this.db.find(conds);
    },

    new: function (id) {
        return new this.constructor(this.db, id);
    },

    create: function (attributes) {
        var newModel = new this.constructor(this.db);
        newModel.attributes = new this.db(attributes);
        return newModel;
    }

});

module.exports = BaseCollection;