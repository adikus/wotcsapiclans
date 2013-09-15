var cls = require("./../lib/class");
var BaseController = require('./base_controller');
var _ = require('underscore');

module.exports = BaseController.extend({

    index: function () {
        this.success(this.options);
    },

    info: function () {
        var self = this;
        var id = parseInt(this.options[0]);
        if(isNaN(id)){
            this.fail({error:"Bad clan id"});
            return false;
        }

        if(this.app.clanWorker.hasClan(id)){
            var clan = this.app.models.Clans.new(id);
            clan.loadAttributes(function(isNew) {
                if(isNew){
                    self.app.clanWorker.addSuccessCallback(id,function(clan){
                        self.success(clan.getData());
                    });
                }else{
                    self.success(clan.getData());
                }
            });
        }else{
            this.app.clanWorker.addClan(id,function (clan) {
                self.success(clan.getData());
            });
        }
        return true;
    },

    changes: function () {
        var self = this;
        var id = parseInt(this.options[0]);
        var limit = this.options.limit ? this.options.limit : 20;
        var page = this.options.page ? this.options.page : 1;
        var skip = (page-1)*limit;
        if(isNaN(id)){
            this.fail({error:"Bad clan id"});
            return false;
        }

        this.app.models.MemberChanges.find({c:id}).sort("-u").skip(skip).limit(limit).exec(function(err, changes) {
            var ret = {page: page, limit: limit};
            var IDs = _.map(changes,function(change){return change.p;});
            var names = {};

            self.app.models.Players.find({_id:{$in:IDs}}).select("_id n").exec(function(err, players){
                _.each(players,function(player){names[player._id] = player.n});
                ret.changes = _.map(changes,function(change){
                    return {
                        player: change.p,
                        change: change.ch,
                        name: names[change.p]?names[change.p]:"",
                        updated_at: change.u
                    };
                });
                self.success(ret);
            });
        });
        return true;
    }

});