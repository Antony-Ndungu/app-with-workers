const { MongoClient, ObjectId } = require("mongodb");
const assert = require("assert");

MongoClient.connect("mongodb://localhost:27017", { useNewUrlParser: true }, (err, client) => {
    assert.equal(null, err);
    console.log("Connected to the mongodb server successfully");
    const db = client.db("test");
    let cursor =  db.collection("test").find({_id: ObjectId("5b018e4f8cea2a2b2badcaa4")});
    cursor.next().then(response => console.log(response));
});