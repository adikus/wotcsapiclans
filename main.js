function main(){
    "use strict";

    var App = require('./app');

    console.log('Booting application.');

    var app = new App();

    process.on('uncaughtException',function(E){
        console.log(E.stack);
        setTimeout(function(){
            process.exit(1);
        },10);
    });
}

main();