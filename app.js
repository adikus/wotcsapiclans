var cls = require("./lib/class");
var Router = require('./router');
var Server = require('./server');
var Config = require("./config");

module.exports = cls.Class.extend({
	init: function () {
        "use strict";

        this.controllers = require("./controllers");
        this.workers = require("./workers");
        this.models = require("./models");

        this.server = new Server(this);

        this.router = new Router(this);

        this.requestWorker = new this.workers.RequestWorker(this, Config.requestWorker.simultaneous);
        this.clanWorker = new this.workers.ClanWorker(this);

        var self = this;
        this.models.onConnected(function(){
            self.server.listen(Config.server.port);
            self.clanWorker.run();
            self.requestWorker.run();
        });
	}
});