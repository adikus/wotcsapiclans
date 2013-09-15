module.exports = Config = {
    server: {
        port: process.env.PORT || 3000
    },
    database: {
        clan: process.env.WOTCS_CLANDB || "mongodb://localhost/wotcsapiclans",
        player: process.env.WOTCS_PLAYERDB || "mongodb://localhost/wotcsapiplayers",
        stats: process.env.MONGOHQ_URL || "mongodb://localhost/wotcsapistats"
    },
    requestWorker: {
        simultaneous: 12
    }

};