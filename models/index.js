var mongoose = require('mongoose');
var _ = require('underscore');
var Config = require('./../config');

var connected_callback = null;
var databases = {};
var connectCountDown = _.size(Config.database);

_.each(Config.database,function (uri, name) {
    databases[name] = mongoose.createConnection(uri,function(err){
        if (err){
            console.log("Error connecting to "+name+" DB.");
            throw err;
        } else{
            console.log("Connected to "+name+" DB.");
            connectCountDown--;
            if(connectCountDown == 0)connected_callback();
        }
    });
});

var exports = {};
var models = {};

require("fs").readdirSync("./models").forEach(function(file) {
    if(file === 'index.js' || file === 'base_model.js' || file === 'base_collection.js') { return false; }
    var parts = file.split('.')[0].split('_');
    var name = _.map(parts,function (part) {
        return part.charAt(0).toUpperCase() + part.slice(1);
    }).join('');
    models[name] = require("./" + file);
    return true;
});

exports.onConnected = function (callback) {
    connected_callback = callback;
};

_.each(models,function (model, name) {
    if(name.slice(-1) == 's'){
        exports[name] = new model(databases, models);
    }
});

module.exports = exports;