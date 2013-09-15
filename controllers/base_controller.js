var cls = require("./../lib/class");

module.exports = cls.Class.extend({

    init: function (app, name, callback, options, data) {
        this.app = app;
        this.name = name;
        this.callback = callback;
        this.options = options;
        this.data = data;
        this.action = 'index';
        this.startedAt = new Date();
    },

    callAction: function (action) {
        this.action =  action || this.action;
        if(typeof this[this.action] !== 'function'){
            this.fail({error: 'Action not found.'});
            return false;
        }
        return this[this.action]();
    },

    success: function (data) {
        this.callback(200,{status: 'ok', data: data});
        console.log('200:',this.name, this.action, this.options, this.data, this.duration()+'ms');
    },

    fail: function (error) {
        this.callback(404,{status: 'error', error: error});
        console.log('404:',this.name, this.action, this.options, this.data, error, this.duration()+'ms');
    },

    duration: function () {
        return (new Date()).getTime() - this.startedAt.getTime();
    }

});