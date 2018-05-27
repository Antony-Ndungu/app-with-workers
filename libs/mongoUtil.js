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
            console.log("Connected to mongodb server successfully.");
            db = client.db("app");
            callback(db);
        });
    },
    getDb: () => db
}

module.exports = mongoUtil;