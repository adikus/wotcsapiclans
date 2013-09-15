var exports = {};

require("fs").readdirSync("./workers").forEach(function(file) {
    if(file === 'index.js') { return false; }
    var nameParts = file.split('.')[0].split('_');
    var name= '';
    nameParts.forEach(function(part) {
        name += part.charAt(0).toUpperCase() + part.slice(1);
    });
    exports[name] = require("./" + file);
    return true;
});

module.exports = exports;