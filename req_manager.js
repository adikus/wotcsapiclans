var cls = require("./lib/class");
var _ = require("underscore");
var Request = require("./shared/request");
var Regions = require("./shared/regions");

module.exports = cls.Class.extend({
	init: function(){
		var self = this;
		this.config = require("./config");

		this.currentRequests = {};
		this.lastFinish = new Date();
		this.recentRequests = [];
		this.failedTasks = [];
		this.waitTime = this.config.waitTime;

		setInterval(function(){self.step();},250);

		this.tasks = {};
		this.taskID = 0;
	},

	addReq: function(cid, subject, wid, callback) {
		var region = Regions.getRegion(wid);
		if(subject == 'accounts'){
			var ret = {};
			var next = _.after(2, function() {
				callback(ret);
			});
			this.addTask(region,'account.info',wid,function(data) {
				ret.info = data;
				next();
			}, !cid);
			this.addTask(region,'account.tanks',wid,function(data) {
				ret.tanks = data;
				next();
			}, !cid);
		}else{
			this.addTask(region,subject,wid,callback);
		}
	},

	addTask: function(region, subject, wid, callback, priority) {
		if(!this.tasks[region+'.'+subject]){ this.tasks[region+'.'+subject] = []; }
		else {
			var taskIndex = this.findTask(region, subject, wid);
			if(taskIndex > -1){
				this.tasks[region+'.'+subject][taskIndex].callbacks.push(callback);
				return;
			}
		}
		var task = {
			callbacks: [callback],
			wid: wid,
			added: new Date()
		};
		if(priority){
			this.tasks[region+'.'+subject].unshift(task);
		}else{
			this.tasks[region+'.'+subject].push(task);
		}
	},

	findTask: function(region, subject, wid) {
		for(var i in this.tasks[region+'.'+subject]){
			if(this.tasks[region+'.'+subject][i].wid == wid){ return i; }
		}
		return -1;
	},

	taskCount: function() {
		var sum = 0;
		_(this.tasks).each(function(tasks) {
			sum += tasks.length;
		});
		return sum + this.failedTasks.length;
	},

	queueLength: function() {
		return this.taskCount();
	},

	queueLengths: function() {
		var ret = {};
		_(this.tasks).each(function(tasks, key) {
			ret[key] = {
				length: tasks.length,
				added_at: tasks.length && tasks[0].added
			};
		});
		return ret;
	},

	getFailedLength: function() {
		return this.failedTasks.length;
	},

	getCurrentReqs: function() {
		var ret = {};
		_(this.currentRequests).each(function(req, id) {
			ret[id] = req.startedAt;
		});
		return ret;
	},

	getTask: function() {
		var winningTask = {score: -1};
		_(this.tasks).each(function(tasks, key) {
			if(tasks.length == 0){ return; }
			var score = ((new Date()).getTime() - tasks[0].added.getTime())*tasks.length;
			if(score > winningTask.score){
				winningTask = {
					score: score,
					key: key
				};
			}
		});

		var IDs = [];
		var callbacks = [];
		while(IDs.length < this.config.idsInOneRequest && this.tasks[winningTask.key].length > 0){
			var task = this.tasks[winningTask.key].shift();
			IDs.push(task.wid);
			callbacks.push.apply(callbacks, task.callbacks);
		}
		var split = winningTask.key.split('.');
		return {
			ID: this.taskID++,
			region: split[0],
			subject: split[1],
			method: split[2],
			callbacks: callbacks,
			IDs: IDs
		}
	},

	step: function(){
		var sinceLastRequest = (new Date()).getTime() - this.lastFinish.getTime();
		if(this.taskCount() > 0 && _(this.currentRequests).size() < this.config.simultaneousRequests
			&& sinceLastRequest > Math.max(this.config.waitTime, this.waitTime)) {
			var task;
			if(this.failedTasks.length > 0){
				task = this.failedTasks.shift();
			}else{
				task = this.getTask();
			}
			this.doTask(task);
		}
	},

	doTask: function(task) {
		var start = new Date();
		var subject = task.subject;
		var method = task.method;
		var fields = null;
		if(subject == 'account' && method == 'info'){ fields = 'statistics.all,nickname';}
		if(subject == 'account' && method == 'tanks'){ fields = 'statistics.battles,statistics.wins,tank_id,mark_of_mastery'; }
		if(subject == 'clans' && method == 'info'){ fields = 'description_html,tag,motto,name,members.account_id,members.account_name,members.joined_at'; }

		var req = new Request(subject, method, task.IDs, fields);
		this.currentRequests[task.ID] = req;
		var self = this;
		req.onSuccess(function(data) {
			self.executeCallbacks(task.callbacks, data);
			self.calcReqStats(start,task.IDs.length);
			self.lastFinish = new Date();
			self.setWaitTime(start);
			delete self.currentRequests[task.ID];
		});

		req.onError(function(error){
			self.failTask(task);
			self.calcReqStats(start,0);
			self.lastFinish = new Date();
			self.setWaitTime(start);
			delete self.currentRequests[task.ID];
		});

		setTimeout(function(){
			if(self.currentRequests[task.ID]){
				self.failTask(task);
				self.calcReqStats(start,0);
				self.lastFinish = new Date();
				self.setWaitTime(start);
				delete self.currentRequests[task.ID];
			}
		},60000);
	},

	setWaitTime: function(start) {
		this.waitTime =((new Date()).getTime() - start.getTime())*this.config.waitMultiplier/this.config.simultaneousRequests;
	},

	failTask: function(task) {
		if(!task.retries){
			task.retries = 0;
		}
		task.retries++;
		if(task.retries < 3){
			this.failedTasks.push(task);
		}
	},

	calcReqStats: function(start, count){
		var now = new Date();
		var duration = now.getTime() - start.getTime();
		this.recentRequests.push({
			duration: duration,
			start: start,
			finish: now,
			count: count
		});
		while(this.recentRequests.length > 0 && now.getTime() - this.recentRequests[0].finish.getTime() > 30*1000){
			this.recentRequests.shift();
		}

	},

	executeCallbacks: function(callbacks, data) {
		_(callbacks).each(function(callback){
			callback(data);
		});
	},

	pos: function(wid, cid){
		var region = Regions.getRegion(wid);
		var taskIndex1 = Math.max(this.findTask(region, 'account.info', wid),0);
		var taskIndex2 = Math.max(this.findTask(region, 'account.tanks', wid),0);
		return Math.max(taskIndex1,taskIndex2)*_(this.tasks).size();
	},

	speed: function() {
		if(this.recentRequests.length == 0){
			return 0;
		}else{
			var count = _.reduce(_(this.recentRequests).pluck('count'), function(memo, num){ return memo + num; }, 0);
			var duration = (_(this.recentRequests).last().finish.getTime() - this.recentRequests[0].start.getTime())/1000;
			return count / duration;
		}
	},

	getAverageTime: function() {
		return this.recentRequests.length > 0 ?
			_.reduce(_(this.recentRequests).pluck('duration'), function(memo, num){ return memo + num; }, 0)/this.recentRequests.length
			: 0;
	}

});