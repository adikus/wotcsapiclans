var cls = require("./../lib/class");
var _ = require("underscore");
var shared = require('./../shared');

module.exports = cls.Class.extend({

    init: function (app) {
        console.log('Starting clan manger.');

        this.app = app;
        this.Clans = this.app.models.Clans;
        this.Players = this.app.models.Players;
        this.MemberChanges = this.app.models.MemberChanges;
        this.RequestWorker = this.app.requestWorker;

        this.clanList = [];
        this.pos = 0;
        this.loadQueue = [];
        this.loadingFromDB = false;
        this.retries = {};
        this.cycleDuration = "-";
        this.successCallbacks = {};
        this.missingClans = [];
    },

    run: function () {
        var self = this;
        setInterval(function(){self.step();},50);
    },

    step: function () {
        var self = this;

        if(this.app.requestWorker.canTakeMore() && this.queueLength() > 0){
            var clan = this.Clans.new(this.getIdFromQueue());
            if(this.isMissing(clan.id))return false;
            if (clan.getRegion() != shared.Regions.VN){
                this.RequestWorker.addReq('clans', clan.id, function (data) {
                    clan.update(shared.parseData(data), function (reply) {
                        self.handleClanUpdateReply(clan, reply);
                    });
                },function () {
                    self.handleTimeout(clan);
                });
            }
        }else if(this.queueLength() == 0 && this.canLoadClans()){
            this.loadClansFromDB();
        }
        return true;
    },

    handleClanUpdateReply: function (clan, reply) {
        var self = this;

        if(reply.status == 'error' && reply.error == 'ParseError'){
            console.log('Error:',reply.error,clan.id);
            this.retries[clan.id] = this.retries[clan.id]?this.retries[clan.id]+1:1;
            if(this.retries[clan.id] < 3)this.loadQueue.unshift(clan.id);
        }else{
            if(reply.status == 'error'){
                if(reply.error == 'CLANS_CLAN_DELETED' || reply.error == 'CLANS_CLAN_MISSING'){
                    this.missingClans.push(clan.id);
                }
            }
            this.execSuccessCallbacks(clan);
            if(reply.leftPlayerIDs && reply.leftPlayerIDs.length > 0){
                this.addPlayerChanges(-1, reply.leftPlayerIDs, clan.id);
                this.ensurePlayersExistence(reply.leftPlayerIDs, 0);
            }
            if(reply.joinedPlayerIDs && reply.joinedPlayerIDs.length > 0){
                this.addPlayerChanges(1, reply.joinedPlayerIDs, clan.id);
            }
            if(reply.clanPlayerIDs && reply.clanPlayerIDs.length > 0){
                this.ensurePlayersExistence(reply.clanPlayerIDs, clan.id);
            }
            clan.save(function(err){
                if(err)console.log(err,"Clan",clan.id);
                if(self.retries[clan.wid])delete self.retries[clan.wid];
            });
        }
    },

    addPlayerChanges: function (change, playersIDs, clanID) {
        var self = this;
        _.each(playersIDs, function(id) {

            var mc = self.MemberChanges.create({
                c: clanID,
                p: id,
                ch: change,
                u: new Date()
            });
            mc.save();
        });
    },

    ensurePlayersExistence: function (playersIDs, clanID) {
        var self = this;
        _.each(playersIDs, function(id) {
            var player = self.Players.new(id);
            player.loadAttributes(function (isNew) {
                var prevID = player.attributes.c;
                player.attributes.c = clanID;
                if(prevID != clanID){
                    player.save(function(err){
                        if(err)console.log(err,"Player");
                        else {
                            if(isNew){
                                console.log("New player created: "+id+" (clan: "+clanID+")");
                            }else{
                                console.log("Player updated: "+id+" (clan: "+prevID+"->"+clanID+")");
                            }
                        }
                    });
                }
            });
        });
    },

    handleTimeout: function(clan) {
        console.log('Timeout:',clan.wid);
        this.retries[clan.id] = this.retries[clan.id]?this.retries[clan.id]+1:1;
        if(this.retries[clan.id] < 3)this.loadQueue.unshift(clan.id);
    },

    execSuccessCallbacks: function(clan){
        if(this.successCallbacks[clan.id]){
            _.each(this.successCallbacks[clan.id],function(s){
                s(clan);
            });
            delete this.successCallbacks[clan.id];
        }
    },

    addSuccessCallback: function(id, callback){
        if(!this.successCallbacks[id])this.successCallbacks[id] = [];
        this.successCallbacks[id].push(callback);
    },

    addClan: function (id, callback) {
        this.loadQueue.unshift(id);
        this.clanList.push(id);
        console.log("New clan created: "+id);

        this.addSuccessCallback(id,function(clan){
            callback(clan);
        });
    },

    canLoadClans: function () {
        return !this.loadingFromDB;
    },

    getIdFromQueue: function () {
        return this.loadQueue.shift();
    },

    queueLength: function () {
        return this.loadQueue.length;
    },

    duration: function () {
        if(!this.startTime)return false;
        return Date.now() - this.startTime.getTime();
    },

    hasClan: function (id) {
        return _.contains(this.clanList,id);
    },

    isMissing: function (id) {
        return _.contains(this.missingClans,id);
    },

    loadClansFromDB: function() {
        var self = this;
        this.loadingFromDB = true;

        if(this.startTime){
            this.cycleDuration = shared.durationToString( this.duration() );
        }
        console.log('Loading clan list from DB.');
        this.Clans.find().sort('u').select('_id').exec(function(err, docs){
            var ids = [];
            _.each(docs,function(doc){
                if(doc._id){
                    ids.push(doc._id);
                    self.loadQueue.push(doc._id);
                }
            });
            self.clanList = ids;
            self.loadingFromDB = false;
            self.startTime = new Date();
            console.log('Clan list loaded successfully.');
        });
    }

});