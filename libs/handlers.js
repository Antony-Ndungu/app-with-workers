const assert = require("assert");
const {
    ObjectID,
    ObjectId
} = require("mongodb");
const config = require("../config");
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
    checks: (data, callback) => {
        const accepatableMethods = ["get", "post", "put", "delete"];
        if (accepatableMethods.indexOf(data.method) > -1) {
            handlers._checks[data.method](data, callback);
        } else {
            callback(405, {
                Error: "This service does not support the specified HTTP method for the specified resource."
            });
        }
    },
    _users: {
        get: (data, callback) => {
            let phoneNumber = typeof (data.query.phoneNumber) == "string" && data.query.phoneNumber.trim().length == 12 ? data.query.phoneNumber.trim() : false;

            if (phoneNumber) {
                let token = typeof (data.headers.token) == "string" && data.headers.token.trim().length == 20 ? data.headers.token.trim() : false;
                if (token) {
                    handlers._tokens.verifyToken(token, phoneNumber, tokenIsValid => {
                        if (tokenIsValid) {
                            const db = getDb();
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
                                    if (result) {
                                        callback(200, {
                                            result
                                        });
                                    } else {
                                        callback(404);
                                    }

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
                            callback(403, {
                                Error: "Invalid access token."
                            });
                        }
                    });
                } else {
                    callback(403, {
                        Error: "Missing token in the header or invalid token."
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
            let phoneNumber = typeof (data.payload.phoneNumber) == "string" && data.payload.phoneNumber.trim().length == 12 ? data.payload.phoneNumber.trim() : false;
            let firstname = typeof (data.payload.firstname) == "string" && data.payload.firstname.trim().length > 0 ? data.payload.firstname.trim() : false;
            let lastname = typeof (data.payload.lastname) == "string" && data.payload.lastname.trim().length > 0 ? data.payload.lastname.trim() : false;
            let password = typeof (data.payload.password) == "string" && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
            if (phoneNumber) {
                let token = typeof (data.headers.token) == "string" && data.headers.token.trim().length == 20 ? data.headers.token.trim() : false;
                if (token) {
                    handlers._tokens.verifyToken(token, phoneNumber, tokenIsValid => {
                        if (tokenIsValid) {
                            const db = getDb();
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
                            callback(403, {
                                Error: "Invalid access token."
                            });
                        }
                    });
                } else {
                    callback(403, {
                        Error: "Missing token in the header or invalid token."
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
                let token = typeof (data.headers.token) == "string" && data.headers.token.trim().length == 20 ? data.headers.token.trim() : false;
                if (token) {
                    handlers._tokens.verifyToken(token, phoneNumber, tokenIsValid => {
                        if (tokenIsValid) {
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
                                            if(err){
                                                callback(500, { Error: err});
                                            }else{
                                                if(result.deletedCount == 1){
                                                    db.collection("checks").deleteMany(filter, (err, result) => {
                                                        if(err){
                                                            callback(500, {Error: err});
                                                        }else{
                                                            callback(200, { Success: "Operation successful.", deletedCount: result.deletedCount});
                                                        }
                                                    })
                                                }else{
                                                    callback(500, {Error: "Failed to delete the user."});
                                                }
                                            }
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
                            callback(403, {
                                Error: "Invalid access token."
                            });
                        }
                    });
                } else {
                    callback(403, {
                        Error: "Missing token in the header or invalid token."
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
                        if (result) {
                            callback(200, {
                                result
                            });
                        } else {
                            callback(404);
                        }
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
                                    $set: {
                                        expires
                                    }
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
            let id = typeof (data.query.id) == "string" && data.query.id.trim().length == 20 ? data.query.id.trim() : false;
            if (id) {
                const db = getDb();
                let cursor = db.collection("tokens").find({
                    id
                });
                cursor.project({
                    id: 1,
                    _id: 0
                });
                cursor.hasNext().then(response => {
                    if (response) {
                        db.collection("tokens").deleteOne({
                            id
                        }, (err, result) => {
                            if (err) {
                                callback(500, {
                                    Error: err
                                });
                            } else if (result.deletedCount == 1) {
                                callback(200, {
                                    Success: "The token was deleted successfully."
                                });
                            } else {
                                callback(500, {
                                    Error: "Could not delete the token"
                                });
                            }
                        });
                    } else {
                        callback(400, {
                            Error: "Could not find a token with the specified id."
                        });
                    }
                }).catch(error => {
                    callback(500, {
                        Error: error
                    });
                })

            } else {
                callback(400, {
                    Error: "Missing required field or invalid field"
                });
            }
        },
        verifyToken: (id, phoneNumber, callback) => {
            id = typeof (id) == "string" && id.trim().length == 20 ? id.trim() : false;
            phoneNumber = typeof (phoneNumber) == "string" && phoneNumber.length > 0 ? phoneNumber : false;
            if (id && phoneNumber) {
                const filter = {
                    id
                };
                let projection = {
                    _id: 0,
                    phoneNumber: 1
                };
                const db = getDb();
                if(db){
                    db.collection("tokens").findOne(filter, projection, (err, token) => {
                        if(err){
                            console.log("An error occurred while finding the token in database.");
                            callback(false);
                        }else{
                            if(phoneNumber == token.phoneNumber){
                                if(token.expires > Date.now()){
                                    callback(true);
                                }else{
                                    console.log(token.expires);
                                    console.log(Date.now())
                                    console.log("The token is expired");
                                    callback(false);
                                }
                            }else{
                                console.log("Phone number provided did not match the token's phoneNumber");
                                callback(false);
                            }
                        }
                    });
                }else{
                    console.log("db object could not be found.");
                    callback(false);
                }

            } else {
                console.log("id and phoneNumber failed input validation");
                callback(false);
            }
        }
    },
    _checks: {
        get: (data, callback) => {
            let _id = typeof (data.query._id) == "string" && ObjectID.isValid(data.query._id) ? data.query._id.trim() : false;
            if (_id) {
                let token = typeof (data.headers.token) == "string" && data.headers.token.trim().length > 0 ? data.headers.token.trim() : false;
                if (token) {
                    const db = getDb();
                    db.collection("checks").findOne({
                        _id: ObjectId(_id)
                    }, (err, result) => {
                        if (err) {
                            callback(500, {
                                Error: "An error occured while finding the check with the specified _id."
                            });
                        } else {
                            if (result) {
                                handlers._tokens.verifyToken(token, result.phoneNumber, (tokenIsValid) => {
                                    if (tokenIsValid) {
                                        callback(200, {
                                            Success: result
                                        });
                                    } else {
                                        callback(403);
                                    }
                                });
                            } else {
                                callback(404);
                            }
                        }
                    });
                } else {
                    callback(403);
                }
            } else {
                callback(400, {
                    Error: "Missing required input or input is invalid."
                });
            }
        },
        post: (data, callback) => {
            let protocol = typeof (data.payload.protocol) == "string" && ["https", "http"].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
            let url = typeof (data.payload.url) == "string" && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
            let method = typeof (data.payload.method) == "string" && ["get", "post", "put", "delete"].indexOf(data.payload.method) > -1 ? data.payload.method : false;
            let successCodes = typeof (data.payload.successCodes) == "object" && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
            let timeSeconds = typeof (data.payload.timeSeconds) == "number" && data.payload.timeSeconds % 1 === 0 && data.payload.timeSeconds >= 1 && data.payload.timeSeconds <= 5 ? data.payload.timeSeconds : false;
            if (protocol && url && method && successCodes && timeSeconds) {
                let token = typeof (data.headers.token) == "string" && data.headers.token.trim().length > 0 ? data.headers.token.trim() : false;
                if (token) {
                    let query = {
                        id: token
                    };
                    let projection = {
                        fields: {
                            _id: 0,
                            phoneNumber: 1
                        }
                    };
                    let db = getDb();
                    db.collection("tokens").findOne(query, projection, (err, result) => {
                        if (err) {
                            callback(500, {
                                Error: "Something went wrong while finding the access token."
                            });
                        } else if (result) {
                            let query = {
                                phoneNumber: result.phoneNumber
                            };
                            let projection = {
                                _id: 0,
                                checks: 1,
                                phoneNumber: 1
                            };
                            db.collection("users").findOne(query, projection, (err, result) => {
                                if (err) {
                                    callback(500, {
                                        Error: "Something went wring while finding the user corresponding to the access token provided"
                                    });
                                } else {
                                    if (result) {
                                        let userChecks = typeof (result.checks) == "object" && result.checks instanceof Array ? result.checks : [];
                                        let userPhone = result.phoneNumber;
                                        if (userChecks.length < config.maxChecks) {
                                            let check = {
                                                protocol,
                                                url,
                                                method,
                                                successCodes,
                                                timeSeconds,
                                                phoneNumber: result.phoneNumber
                                            }
                                            db.collection("checks").insertOne(check, (err, result) => {
                                                if (err) {
                                                    callback(500, {
                                                        Error: "An error occurred while saving the check."
                                                    });
                                                } else {
                                                    if (result.insertedCount == 1) {
                                                        userChecks.push(result.insertedId);
                                                        db.collection("users").updateOne({
                                                            phoneNumber: userPhone
                                                        }, {
                                                            $set: {
                                                                checks: userChecks
                                                            }
                                                        }, (err, result) => {
                                                            if (err) {
                                                                callback(500, {
                                                                    Error: "An error occured while updating the user's checks"
                                                                });
                                                            } else {
                                                                if (result.modifiedCount == 1) {
                                                                    callback(200, {
                                                                        Success: check
                                                                    });
                                                                } else {
                                                                    callback(500, {
                                                                        Error: "Something went wrong while updating the user's checks."
                                                                    });
                                                                }
                                                            }
                                                        });
                                                    } else {
                                                        callback(500, {
                                                            Error: "Something went wrong while saving the check."
                                                        });
                                                    }
                                                }
                                            });
                                        } else {
                                            callback(400, {
                                                Error: "You already have the maximum number of checks (" + config.maxChecks + ")"
                                            });
                                        }
                                    } else {
                                        callback(403);
                                    }
                                }
                            });
                        } else {
                            callback(403);
                        }
                    });
                } else {
                    callback(403);
                }
            } else {
                callback(400, {
                    Error: "Missing required input(s) or input(s) are invalid."
                });
            }
        },
        put: (data, callback) => {
            let _id = typeof (data.payload._id) == "string" && ObjectID.isValid(data.payload._id.trim()) ? data.payload._id.trim() : false;
            let protocol = typeof (data.payload.protocol) == "string" && ["https", "http"].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
            let url = typeof (data.payload.url) == "string" && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
            let method = typeof (data.payload.method) == "string" && ["get", "post", "put", "delete"].indexOf(data.payload.method) > -1 ? data.payload.method : false;
            let successCodes = typeof (data.payload.successCodes) == "object" && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
            let timeSeconds = typeof (data.payload.timeSeconds) == "number" && data.payload.timeSeconds % 1 === 0 && data.payload.timeSeconds >= 1 && data.payload.timeSeconds <= 5 ? data.payload.timeSeconds : false;
            if (_id) {
                if (protocol || url || method || successCodes || timeSeconds) {
                    let token = typeof (data.headers.token) == "string" && data.headers.token.trim().length > 0 ? data.headers.token.trim() : false;
                    if (token) {
                        const db = getDb();
                        db.collection("checks").findOne({
                            _id: ObjectId(_id)
                        }, (err, result) => {
                            if (err) {
                                callback(500, {
                                    Error: "An error occured while finding the check with the specified _id."
                                });
                            } else {
                                if (result) {
                                    handlers._tokens.verifyToken(token, result.phoneNumber, (tokenIsValid) => {
                                        if (tokenIsValid) {
                                            let filter = { _id: ObjectId(_id) };
                                            let update = {};
                                            if (protocol) {
                                                update = {
                                                    ...update,
                                                    protocol
                                                };
                                            }
                                            if (method) {
                                                update = {
                                                    ...update,
                                                    method
                                                };
                                            }
                                            if (url) {
                                                update = {
                                                    ...update,
                                                    url
                                                };
                                            }
                                            if (successCodes) {
                                                update = { ...update,
                                                    successCodes
                                                };
                                            }
                                            if (timeSeconds) {
                                                update = { ...update,
                                                    timeSeconds
                                                };
                                            }
                                            update  = {$set: update};
                                            db.collection("checks").updateOne(filter, update, (err, result) => {
                                                if (err) {
                                                    callback(500, {
                                                        Error: err
                                                    });
                                                } else {
                                                    if (!(result.matchedCount == 1)) {
                                                        callback(500, {
                                                            Error: "Could not find the document to update"
                                                        });
                                                    } else {
                                                        if ((result.modifiedCount == 1)) {
                                                            callback(200, {
                                                                Success: "The check was updated successfully."
                                                            });
                                                        } else {
                                                            callback(500, {
                                                                Error: "Could not modify the document specified."
                                                            })
                                                        }
                                                    }
                                                }
                                            });
                                        } else {
                                            callback(403);
                                        }
                                    });
                                } else {
                                    callback(404);
                                }
                            }
                        });
                    } else {
                        callback(403);
                    }
                } else {
                    callback(400, {
                        Error: "Missing field(s) to be updated."
                    });
                }
            } else {
                callback(400, {
                    Error: "Missing required input or input is invalid."
                });
            }
        },
        delete: (data, callback) => {
            let _id = typeof (data.query._id) == "string" && ObjectID.isValid(data.query._id.trim()) ? data.query._id.trim() : false;
            if(_id){
                let token = typeof(data.headers.token) == "string" && data.headers.token.trim().length > 0 ? data.headers.token.trim() : false;
                if(token){
                    const db = getDb();
                    if(db){
                        let query = {
                            _id: ObjectId(_id)
                        }
                        let projection = {
                            phoneNumber: 1
                        }
                        let cursor = db.collection("checks").find(query);
                        cursor.project(projection);
                        cursor.hasNext().then(response => {
                            if(response){
                                cursor.next().then(check => {
                                    if(check){
                                        handlers._tokens.verifyToken(token, check.phoneNumber, tokenIsValid => {
                                            if(tokenIsValid){                                    
                                                db.collection("checks").deleteOne(query, (err, result) => {
                                                    if(err){
                                                        callback(500, {Error: err});
                                                    }else{
                                                        if(result.deletedCount == 1){
                                                            db.collection("users").findOne({phoneNumber: check.phoneNumber}, {checks: 1, _id: 0, phoneNumber: 1}, (err, user) => {
                                                                if(err){
                                                                    callback(500, { Error: err});
                                                                }else{
                                                                    let checks = typeof(user.checks) == "object" && user.checks instanceof Array ? user.checks : false;
                                                                    if(checks){
                                                                        let checksStrings = []
                                                                        for(let i = 0; i < checks.length ; i ++){
                                                                            checksStrings.push(checks[i].toString());
                                                                        }
                                                                        let index = checksStrings.indexOf(_id);
                                                                        if(index > -1){
                                                                            checks.splice(index, 1);
                                                                            db.collection("users").updateOne({ phoneNumber: user.phoneNumber}, {$set: { checks }}, (err, updateUserResult) => {
                                                                                if(err){
                                                                                    callback(500, { Error: err});
                                                                                }else{
                                                                                    if(updateUserResult.matchedCount == 1 && updateUserResult.modifiedCount){
                                                                                        callback(200, { Success: "Operation successful." });
                                                                                    }else{
                                                                                        callback(500, { Error: "Could not update the user object checks because no user was matched or modification failed."});
                                                                                    }
                                                                                }
                                                                            });
                                                                        }else{
                                                                            callback(500, { Error: "Could not find the check id to be deleted in the user's object"});
                                                                        }
                                                                    }else{
                                                                        callback(200, { Success: "Operation successful."});
                                                                    }
                                                                }
                                                            });
                                                        }else{
                                                            callback(500, { Error: "Something went wrong while deleting the check with the specified id."});
                                                        }
                                                    }
                                                })
                                            }else{
                                                callback(403);
                                            }
                                        });
                                    }else{
                                        callback(500, { Error: "An error occurred while getting the check with the specified id."});
                                    }
                                }).catch(error => callback(500, {Error: "An error occured while deleting the check."}));
                            }else{
                                callback(400, {Error: "The check id specified does not exist"});
                            }
                        }).catch(error =>{
                            callback(500, { Error: error});
                        })
                    }else{
                        callback(500, { Error: "Could not get the database object."});
                    }
                }else{
                    callback(403)
                }
            }else{
                callback(400, { Error: "Missing required input or the input is invalid."});
            }
        }
    }
}


module.exports = handlers;