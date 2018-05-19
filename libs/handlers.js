const assert = require("assert");
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
                        fields: {
                            password: 0
                        }
                    }
                    db.collection("users").findOne(query, projection).then((result) => {
                        callback(200, {
                            result
                        });
                    }).catch((error) => {
                        callback(500, {
                            Error: error
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
                                    Error: "Could not hash update's password."
                                });
                            }
                            let update = {
                                firstname,
                                lastname,
                                phoneNumber,
                                password: hashedPassword,
                                tosAgreement
                            }
                            db.collection("users").insertOne(update, (err, results) => {
                                if (err) throw err;
                                callback(200, {
                                    Success: "User created successfully"
                                });
                            });
                        } else {
                            callback(409, {
                                "Error": "There's another update with the same phone number: " + phoneNumber + "."
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
            let phoneNumber = typeof (data.payload.phoneNumber) == "string" && data.payload.phoneNumber.trim().length == 12 ? data.payload.phoneNumber.trim() : false;
            let firstname = typeof (data.payload.firstname) == "string" && data.payload.firstname.trim().length > 0 ? data.payload.firstname.trim() : false;
            let lastname = typeof (data.payload.lastname) == "string" && data.payload.lastname.trim().length > 0 ? data.payload.lastname.trim() : false;
            let password = typeof (data.payload.password) == "string" && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
            let db = getDb();
            if (phoneNumber) {
                if (firstname || lastname || password) {
                    if (db) {
                        let filter = {
                            phoneNumber
                        };
                        let update = {};
                        let projection = {
                            phoneNumber: 1,
                            _id: 0
                        };
                        let cursor = db.collection("users").find(filter)
                        cursor.project(projection);
                        cursor.hasNext().then(response => {
                            if (response) {
                                if (firstname) {
                                    update = { ...update,
                                        firstname
                                    };
                                }
                                if (lastname) {
                                    update = { ...update,
                                        lastname
                                    };
                                }
                                if (password) {
                                    update = { ...update,
                                        password: helpers.hash(password)
                                    };
                                }
                                update = {
                                    $set: update
                                };
                                db.collection("users").updateOne(filter, update, (err, result) => {
                                    if (err) {
                                        callback(500, {
                                            Error: "An error occurred while trying to update the user."
                                        });
                                    }
                                    if (result.matchedCount != 1) {
                                        callback(500, {
                                            Error: "The specified user was not found."
                                        });
                                    }
                                    if (result.modifiedCount == 1) {
                                        callback(200, {
                                            Success: "The user was update successully"
                                        });
                                    } else {
                                        callback(500, {
                                            Error: "Something went wrong while updating the user."
                                        });
                                    }
                                });
                            } else {
                                callback(400, {
                                    Error: "The specified user was not found."
                                });
                            }
                        }).catch(error => {
                            callback(500, {
                                Error: "Something went wrong while finding the user to update."
                            });
                        })
                    } else {
                        callback(500, {
                            Error: "No database objecet found."
                        });
                    }
                } else {
                    callback(400, {
                        Error: "Missing fields to update."
                    });
                }
            } else {
                callback(400, {
                    Error: "Missing required fields."
                });
            }
        },
        delete: (data, callback) => {
            let phoneNumber = typeof (data.query.phoneNumber) == "string" && data.query.phoneNumber.trim().length == 12 ? data.query.phoneNumber.trim() : false;
            if (phoneNumber) {
                const db = getDb();
                if (db) {
                    let filter = {
                        phoneNumber
                    };
                    let projection = {
                        phoneNumber: 1,
                        _id: 0
                    };
                    let cursor = db.collection("users").find(filter);
                    cursor.project(projection);
                    cursor.hasNext().then(response => {
                        if (response) {
                            db.collection("users").deleteOne(filter, (err, result) => {
                                assert.equal(null, err);
                                assert.equal(1, result.deletedCount);
                                console.log(result);
                                callback(200, {
                                    Success: "User was deleted successfully"
                                });
                            });
                        } else {
                            callback(400, {
                                Error: "The specified user does not exist."
                            });
                        }
                    }).catch(error => {

                    });
                } else {
                    callback(500, {
                        Error: "Could not find the database object"
                    });
                }
            } else {
                callback(400, {
                    Error: "Missing required field."
                });
            }
        }
    }
}


module.exports = handlers;