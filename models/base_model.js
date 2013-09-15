var cls = require("./../lib/class");
var _ = require('underscore');

BaseModel = cls.Class.extend({

    init: function (db, id) {
        this.db = db;
        this.id = id;
    },

    loadAttributes: function(callback) {

        var self = this;

        this.findOrCreate(function (attributes, isNew) {
            self.attributes = attributes;
            callback(isNew);
        });

    },

    findOrCreate: function(callback) {
        var self = this;

        this.db.findOne({_id:self.id},function(err, attributes){
            var isNew = false;
            if(!attributes){
                attributes = new self.db();
                attributes._id = self.id;
                isNew = true;
            }
            callback(attributes, isNew);
        });
    },

    save: function (callback) {
        this.attributes.save(function(err){if(callback)callback(err);});
    }


});

module.exports = BaseModel;