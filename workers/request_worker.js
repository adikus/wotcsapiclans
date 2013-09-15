var cls = require("./../lib/class"),
    _ = require("underscore"),
    Request = require("./../request");
    
module.exports = cls.Class.extend({
	init: function(app, simultaneousReqs){
        this.app = app;

		this.rMax = simultaneousReqs;
		this.r = 0;
		this.ids = [];
		this.successTimes = [];
		this.times = [];
	},

    run: function () {
        var self = this;
        setInterval(function(){self.step();},50);
    },
	
	addReq: function(req, wid, success, timeout){
		this.ids.push({r:req,w:wid,s:[success],t:timeout});
		return this.ids.length-1;
	},
	
	step: function(){
		while(this.r < this.rMax && this.ids.length > 0){
			this.startRequest(this.ids.shift());
		}
		
		var now = new Date();
		if(this.successTimes[0] && this.successTimes[0].getTime() + 10000 < now.getTime())this.successTimes.shift();
	},
	
	startRequest: function(id){
		var self = this,
			time = new Date();

		var req = new Request(id.r,id.w);
			
		req.onSuccess(function(data){
			_.each(id.s,function(s){
				s(data);
			});
			self.r--;
			self.addTime(new Date(),time);
		});
		
		req.onTimeout(function(){
			id.t();
			self.r--;
		});
		
		this.r++;
	},
	
	pos: function(wid){
		var ret = 0;
		
		var f = _.find(this.ids,function(i){
			ret++;
			return i.w == wid;
		});
		if(!f)return -1;
		return ret;
	},

    canTakeMore: function () {
        return this.ids.length < Math.min(Math.max(4,this.speed()*2),20)
    },
	
	addSuccessCallback: function(wid,success){
		for(var i=0;i<this.ids.length;i++){
			if(this.ids[i].w == wid)this.ids[i].s.push(success);
		}
	},
	
	getAverageTime: function() {
		var total = _.reduce(this.times, function(memo, time){ return memo + time; }, 0);
		return this.times.length > 0 ? Math.round( total / this.times.length * 100)/100 : 0;
	},
	
	speed: function(){
		if(this.successTimes.length > 0){
			var diff = this.getDiff(this.successTimes[0],_.last(this.successTimes))/1000;
			return diff == 0 ? 0 :  Math.round(this.successTimes.length / diff * 100)/100;
		} else return 0;
	},
	
	getDiff: function(t1,t2) {
		return t2.getTime() - t1.getTime();
	},
	
	addTime: function(t,s) {
		if(this.successTimes.length > 0 && this.getDiff(_.last(this.successTimes),t) > 30000)this.successTimes = [];
		this.successTimes.push(t);
		
		this.times.push(this.getDiff(s,t));
		if(this.times.length > 100)this.times.shift();
	}
});