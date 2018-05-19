const { MongoClient } = require("mongodb");
const assert = require("assert");

MongoClient.connect("mongodb://localhost:27017", { useNewUrlParser: true }, (err, client) => {
    assert.equal(null, err);
    console.log("Connected to the mongodb server successfully");
    const db = client.db("test");

    db.collection("presidents").find({}).toArray((err, docs) => {
        assert.equal(null, err);
        docs.forEach( doc => {
            console.log(doc.president);
        });
        client.close();
    });
});