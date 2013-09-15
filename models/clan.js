var cls = require("./../lib/class");
var BaseModel = require('./base_model');
var shared = require('./../shared');
var _ = require('underscore');

module.exports = BaseModel.extend({

    getRegion: function () {
        return shared.getRegion(this.id);
    },

    update: function( data, callback ){
        if(!data){
            callback({status: 'error', error: 'ParseError'});
            return false;
        }

        var self = this;

        this.loadAttributes(function() {
            if(data.status == 'error'){
                self.attributes.s = 'Error';
                self.attributes.e = data.status_code;
                callback({status: 'error',error: data.status_code});
            }else{
                self.attributes.t = data.data.abbreviation;
                self.attributes.n = data.data.name;
                self.attributes.m = data.data.motto;
                self.attributes.d = data.data.description_html;
                self.memberIDs = self.getMemberIDs(data.data.members);
                self.ensureNumericIDs();

                var leftPlayerIDs = self.getLeftPlayerIDs();
                var joinedPlayerIDs = self.getJoinedPlayerIDs();

                self.attributes.ms = self.memberIDs;
                self.attributes.markModified('ms');
                callback({status: 'ok', leftPlayerIDs: leftPlayerIDs, joinedPlayerIDs: joinedPlayerIDs, clanPlayerIDs: self.memberIDs});
            }
        });
        return true;
    },

    getData: function(){
        var ret = {};

        ret.tag = this.attributes.t;
        ret.name = this.attributes.n;
        ret.motto = this.attributes.m;
        ret.description = this.attributes.d;
        ret.members = this.attributes.ms;
        ret.clan_status = this.attributes.s;
        ret.clan_error = this.attributes.e;
        ret.updated_at = this.attributes.u;

        return ret;
    },

    getMemberIDs: function (members) {
        var IDs = [];
        for(var i = 0;i < members.length;i++){
            var pid = members[i].account_id;
            IDs.push(pid);
        }
        IDs = _.map(IDs,function(wid){
            return parseInt(wid);
        });
        return IDs;
    },

    ensureNumericIDs: function () {
        this.attributes.ms = _.map(this.attributes.ms,function(wid){
            return parseInt(wid);
        });
    },

    getLeftPlayerIDs: function () {
        var self = this;
        var left = [];

        if(this.attributes.ms && this.attributes.ms.length > 0){
            _.each(this.attributes.ms,function(wid){
                if(!_.contains(self.memberIDs,wid)){
                    left.push(wid);
                    console.log('Player',wid,'left clan',self.id);
                }
            });
        }
        return left;
    },

    getJoinedPlayerIDs: function () {
        var self = this;
        var joined = [];

        if(this.attributes.ms && this.attributes.ms.length > 0){
            _.each(this.memberIDs,function(wid){
                if(!_.contains(self.attributes.ms,wid)){
                    joined.push(wid);
                    console.log('Player',wid,'joined clan',self.id);
                }
            });
        }
        return joined;
    }

});