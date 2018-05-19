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
            callback(405, {
                Error: "This service does not support the specified HTTP method for the specified resource."
            });
        }
    },
    tokens: (data, callback) => {
        const accepatableMethods = ["get", "post", "put", "delete"];
        if (accepatableMethods.indexOf(data.method) > -1) {
            handlers._tokens[data.method](data, callback);
        } else {
            callback(405, {
                Error: "This service does not support the specified HTTP method for the specified resource."
            });
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
    },
    _tokens: {
        get: (data, callback) => {
            let id = typeof (data.query.id) == "string" && data.query.id.trim().length == 20 ? data.query.id.trim() : false;
            const db = getDb();
            if (id) {
                if (db) {
                    const query = {
                        id
                    };
                    const projection = {
                        fields: {
                            _id: 0
                        }
                    }
                    db.collection("tokens").findOne(query, projection).then((result) => {
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
                    Error: "Missing a required field or the value provided is invalid."
                });
            }
        },
        post: (data, callback) => {
            let phoneNumber = typeof (data.payload.phoneNumber) == "string" && data.payload.phoneNumber.trim().length == 12 ? data.payload.phoneNumber.trim() : false;
            let password = typeof (data.payload.password) == "string" && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
            if (phoneNumber && password) {
                const db = getDb();
                let query = {
                    phoneNumber
                };
                let projection = {
                    password: 1,
                    _id: 0
                };
                let cursor = db.collection("users").find(query);
                cursor.project(projection);
                cursor.hasNext().then(response => {
                    if (response) {
                        cursor.next().then(response => {
                            if (helpers.hash(password) === response.password) {
                                let tokenId = helpers.createRamdomString(20);
                                if (tokenId) {
                                    let expires = Date.now() + (60 * 60 * 1000);
                                    let token = {
                                        id: tokenId,
                                        phoneNumber,
                                        expires
                                    };
                                    db.collection("tokens").insertOne(token, {
                                        _id: 0
                                    }, (err, result) => {
                                        if (err) {
                                            callback(500, {
                                                Error: "An error occurred while saving the token."
                                            });
                                        } else if (result.insertedCount == 1) {
                                            delete token._id;
                                            callback(200, {
                                                token
                                            });
                                        } else {
                                            callback(500, {
                                                Error: "Could not save the token"
                                            });
                                        };
                                    });
                                } else {
                                    callback(500, {
                                        Error: "Could not create token."
                                    });
                                }
                            } else {
                                callback(400, {
                                    Error: "The specified password did not match the specified user's password."
                                });
                            }
                        }).catch(error => {
                            callback(500, {
                                Error: "Something went wrong while finding the specified user's password."
                            });
                        });
                    } else {
                        callback(400, {
                            Error: "Could not find a user with the specified phoneNumber."
                        });
                    }
                }).catch(error => {
                    callback(500, {
                        Error: "Something went wrong while finding the user with the specified phoneNumber."
                    });
                });
            } else {
                callback(400, {
                    Error: "Missing required field(s)."
                });
            }
        },
        put: (data, callback) => {
            let id = typeof (data.payload.id) == "string" && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
            let extend = typeof (data.payload.extend) == "boolean" && data.payload.extend == true ? true : false;
            if (id && extend) {
                const db = getDb();
                let query = {
                    id
                };
                let projection = {
                    _id: 0,
                    expires: 1
                };
                let cursor = db.collection("tokens").find(query);
                cursor.project(projection);
                cursor.hasNext().then(response => {
                    if (response) {
                        cursor.next().then(response => {
                            if (response.expires > Date.now()) {
                                let expires = response.expires + (60 * 60 * 1000);
                                let update = {
                                    $set: {expires}
                                };
                                db.collection("tokens").updateOne(query, update, (err, result) => {
                                    if (err) {
                                        callback(500, {
                                            Error: err
                                        });
                                    } else if (result.matchedCount == 0) {
                                        callback(500, {
                                            Error: "Could not find the token with the specified id."
                                        });
                                    } else if (result.modifiedCount == 0) {
                                        callback(500, {
                                            Error: "Could not extend the token."
                                        });
                                    } else {
                                        callback(200, {
                                            Success: "The token has been extended successfully."
                                        });
                                    }
                                });
                            } else {
                                callback(400, {
                                    Error: "Could not extend the token because it has already expired."
                                });
                            }
                        }).catch(error => {
                            callback(500, {
                                Error: error
                            });
                        })
                    } else {
                        callback(400, {
                            Error: "Could not find token with the specified id."
                        });
                    }
                }).catch(error => {
                    callback(500, {
                        Error: error
                    });
                });
            } else {
                callback(400, {
                    Error: "Missing required field(s) or invalid field(s)."
                });
            }
        },
        delete: (data, callback) => {

        }
    }
}


module.exports = handlers;