const config = require("../config");
const {
    MongoClient
} = require("mongodb");
const assert = require("assert");

let db = null;

const mongoUtil = {
    connect: (callback) => {
        callback = typeof(callback) == "function" ? callback : (db) => {};
        MongoClient.connect(config.dbUrl, { useNewUrlParser: true }, (err, client) => {
            assert.equal(null, err);
            console.log('\x1b[32m%s\x1b[0m', "Connected to mongodb server successfully.");
            db = client.db("app");
            callback(db);
        });
    },
    getDb: () => db
}

module.exports = mongoUtil;