const server = require("./libs/server");
const workers = require("./libs/workers");
const mongoUtil = require("./libs/mongoUtil");

const app = {
    init: () => {
        mongoUtil.connect((db) => {
            if (db) {
                server.init();
                workers.init();
            } else {
                console.log("Could not get the database object");
            }
        });
    }
}

app.init();

module.exports = app;