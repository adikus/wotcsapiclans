var cls = require("./lib/class");
var _ = require("underscore");
var url = require("url");
var BaseController = require('./controllers/base_controller');

module.exports = router = cls.Class.extend({
	init: function(app){
        this.app = app;
	},
	
	route: function(reqUrl, data, callback){
        "use strict";

		var path_parts = url.parse(reqUrl, true).path.split("/");
	    var	controllerName = path_parts[1] || 'status';
        var actionName = path_parts[2] || false;
	    var	options = this.parseOptions(path_parts);
        var controller;

        if(!this.app.controllers[controllerName]){
            controller = new BaseController(this.app, controllerName, callback, options, data);
            controller.fail({error: 'Controller not found.'});
            return false;
        }

        controller = new this.app.controllers[controllerName](this.app, controllerName, callback, options, data);
        controller.callAction(actionName);
        return true;
	},
	
	parseOptions: function(path_parts){
        "use strict";

        var options = {};
        var i;

        for(i=3;i<path_parts.length;i++){
            options[i-3] = path_parts[i];
        }

		var ret = {};
		_.each(options,function(option, i){
			var index = option.indexOf("=");
			if(index != -1){
				var key = option.substring(0, index),
					val = option.substring(index+1);
			ret[key] = val;
            ret[i] = val;
			} else { ret[i] = option; }
		});
		return ret; 
	}
});