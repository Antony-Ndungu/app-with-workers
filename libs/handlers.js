const {
    getDb
} = require("./mongoUtil");
const helpers = require("./helpers");
const handlers = {
    ping: (data, callback) => {
        callback(200);
    },
    notFound: (data, callback) => {
        callback(404);
    },
    users: (data, callback) => {
        const accepatableMethods = ["get", "post", "put", "delete"];
        if (accepatableMethods.indexOf(data.method) > -1) {
            handlers._users[data.method](data, callback);
        } else {
            callback(405);
        }
    },
    _users: {
        get: (data, callback) => {
            let phoneNumber = typeof (data.query.phoneNumber) == "string" && data.query.phoneNumber.trim().length == 12 ? data.query.phoneNumber.trim() : false;
            const db = getDb();
            if (phoneNumber) {
                if (db) {
                    const query = {
                        phoneNumber
                    };
                    const projection = {
                        fields: { password: 0 }
                    }
                    db.collection("users").findOne(query, projection).then((result) => {
                        callback(200, {
                            result
                        });
                    }).catch((error) => {
                        callback(500, { Error: error});
                    });
                } else {
                    console.log("Database object not found.");
                    callback(500, {
                        Error: "Database error occurred"
                    });
                }
            } else {
                callback(400, {
                    Error: "Missing required fields."
                });
            }
        },
        post: (data, callback) => {
            let firstname = typeof (data.payload.firstname) == "string" && data.payload.firstname.trim().length > 0 ? data.payload.firstname.trim() : false;
            let lastname = typeof (data.payload.lastname) == "string" && data.payload.lastname.trim().length > 0 ? data.payload.lastname.trim() : false;
            let phoneNumber = typeof (data.payload.phoneNumber) == "string" && data.payload.phoneNumber.trim().length == 12 ? data.payload.phoneNumber.trim() : false;
            let password = typeof (data.payload.password) == "string" && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
            let tosAgreement = typeof (data.payload.tosAgreement) == "boolean" && data.payload.tosAgreement == true ? true : false;
            const db = getDb();
            if (firstname && lastname && phoneNumber && password && tosAgreement) {

                if (db) {
                    let query = {
                        phoneNumber
                    };
                    let projection = {
                        phoneNumber: 1,
                        _id: 0
                    };
                    let cursor = db.collection("users").find(query);
                    cursor.project(projection);
                    cursor.hasNext().then((response) => {
                        if (!response) {
                            let hashedPassword = helpers.hash(password);
                            if (!hashedPassword) {
                                callback(400, {
                                    Error: "Could not hash user's password."
                                });
                            }
                            let user = {
                                firstname,
                                lastname,
                                phoneNumber,
                                password: hashedPassword,
                                tosAgreement
                            }
                            db.collection("users").insertOne(user, (err, results) => {
                                if (err) throw err;
                                callback(200, {
                                    Success: "User created successfully"
                                });
                            });
                        } else {
                            callback(409, {
                                "Error": "There's another user with the same phone number: " + phoneNumber + "."
                            });
                        }
                    }).catch((error) => {
                        callback(500, {
                            "Error": error
                        });
                    });
                } else {
                    console.log("Database object not found.");
                    callback(500, {
                        Error: "Database error occurred"
                    });
                }
            } else {
                callback(400, {
                    Error: "Missing required fields."
                });
            }
        },
        put: (data, callback) => {

        },
        delete: (data, callback) => {

        }
    }
}


module.exports = handlers;