var cls = require("./../lib/class");
var BaseController = require('./base_controller');
var shared = require('./../shared');

module.exports = BaseController.extend({

    index: function () {
        var clansDone = this.app.clanWorker.clanList.length - this.app.clanWorker.loadQueue.length;
        var ret = {
            workers:{
                request:{
                    current_speed: this.app.requestWorker.speed() + " req/s",
                    average_speed: Math.round(clansDone / this.app.clanWorker.duration() * 1000 * 100)/100 + " req/s",
                    average_req_time: this.app.requestWorker.getAverageTime() + " ms"
                },
                clan:{
                    queue_length: this.app.clanWorker.loadQueue.length,
                    current_cycle_duration: shared.durationToString( this.app.clanWorker.duration() ),
                    remaining_time: shared.durationToString( this.app.clanWorker.loadQueue.length/(clansDone / this.app.clanWorker.duration()) ),
                    last_cycle_duration: this.app.clanWorker.cycleDuration,
                    total_count: this.app.clanWorker.clanList.length,
                    retries: this.app.clanWorker.retries,
                    missing_count: this.app.clanWorker.missingClans.length
                }
            }
        };

        this.success(ret);
    }

});