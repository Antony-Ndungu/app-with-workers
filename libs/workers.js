const http = require("http");
const https = require("https");
const url = require("url");
const helpers = require("./helpers");
const {
    ObjectID,
    ObjectId
} = require("mongodb");
const {
    getDb
} = require("./mongoUtil");

const workers = {
    init: () => {
        workers.gatherAllChecks();
        workers.loop();
    },
    gatherAllChecks: () => {
        const db = getDb();
        const cursor = db.collection("checks").find({});
        cursor.count().then(response => {
            if (response > 0) {
                cursor.forEach(check => {
                    workers.validateCheckData(check);
                });
            } else {
                console.log("Could not find any check to process.");
            }
        }).catch(e => console.log(e));
    },
    validateCheckData: (originalCheckData) => {
        originalCheckData = typeof (originalCheckData) == 'object' && originalCheckData !== null ? originalCheckData : {};
        originalCheckData._id = typeof (originalCheckData._id) == 'object' && ObjectID.isValid(originalCheckData._id) ? originalCheckData._id : false;
        originalCheckData.phoneNumber = typeof (originalCheckData.phoneNumber) == 'string' && originalCheckData.phoneNumber.trim().length == 12 ? originalCheckData.phoneNumber.trim() : false;
        originalCheckData.protocol = typeof (originalCheckData.protocol) == 'string' && ['http', 'https'].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol : false;
        originalCheckData.url = typeof (originalCheckData.url) == 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.url.trim() : false;
        originalCheckData.method = typeof (originalCheckData.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(originalCheckData.method) > -1 ? originalCheckData.method : false;
        originalCheckData.successCodes = typeof (originalCheckData.successCodes) == 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false;
        originalCheckData.timeSeconds = typeof (originalCheckData.timeSeconds) == 'number' && originalCheckData.timeSeconds % 1 === 0 && originalCheckData.timeSeconds >= 1 && originalCheckData.timeSeconds <= 5 ? originalCheckData.timeSeconds : false;
        // Set the keys that may not be set (if the workers have never seen this check before)
        originalCheckData.state = typeof (originalCheckData.state) == 'string' && ['up', 'down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : 'down';
        originalCheckData.lastChecked = typeof (originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;
        if (originalCheckData._id &&
            originalCheckData.phoneNumber &&
            originalCheckData.protocol &&
            originalCheckData.url &&
            originalCheckData.method &&
            originalCheckData.successCodes &&
            originalCheckData.timeSeconds) {
            workers.performCheck(originalCheckData);
        } else {
            // If checks fail, log the error and fail silently
            console.log("Error: one of the checks is not properly formatted. Skipping.");
        }
    },
    performCheck: (originalCheckData) => {
        // Prepare the intial check outcome
        var checkOutcome = {
            'error': false,
            'responseCode': false
        };

        // Mark that the outcome has not been sent yet
        var outcomeSent = false;

        // Parse the hostname and path out of the originalCheckData
        var parsedUrl = url.parse(originalCheckData.protocol + '://' + originalCheckData.url, true);
        var path = parsedUrl.path; // Using path not pathname because we want the query string
        var hostName = parsedUrl.hostname;
        // Construct the request
        var requestDetails = {
            'protocol': originalCheckData.protocol + ':',
            'hostname': hostName,
            'method': originalCheckData.method.toUpperCase(),
            'path': path,
            'timeout': originalCheckData.timeSeconds * 1000
        };
        var _moduleToUse = originalCheckData.protocol == 'http' ? http : https;
        var req = _moduleToUse.request(requestDetails, function (res) {
            // Grab the status of the sent request
            var status = res.statusCode;

            // Update the checkOutcome and pass the data along
            checkOutcome.responseCode = status;
            if (!outcomeSent) {
                workers.processCheckOutcome(originalCheckData, checkOutcome);
                outcomeSent = true;
            }
        });
        req.on('error', function (e) {
            // Update the checkOutcome and pass the data along
            checkOutcome.error = {
                'error': true,
                'value': e
            };
            if (!outcomeSent) {
                workers.processCheckOutcome(originalCheckData, checkOutcome);
                outcomeSent = true;
            }
        });

        // Bind to the timeout event
        req.on('timeout', function () {
            // Update the checkOutcome and pass the data along
            checkOutcome.error = {
                'error': true,
                'value': 'timeout'
            };
            if (!outcomeSent) {
                workers.processCheckOutcome(originalCheckData, checkOutcome);
                outcomeSent = true;
            }
        });

        // End the request
        req.end();
    },
    processCheckOutcome: (originalCheckData, checkOutcome) => {
        // Decide if the check is considered up or down
        var state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';

        // Decide if an alert is warranted
        var alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;

        // Update the check data
        var newCheckData = originalCheckData;
        newCheckData.state = state;
        newCheckData.lastChecked = Date.now();

        // Save the updates
        const db = getDb();
        db.collection("checks").updateOne({
            _id: originalCheckData._id
        }, {
            $set: newCheckData
        }, (err, result) => {
            if (err) {
                console.log(err);
            } else {
                if (result.matchedCount == 1 && result.modifiedCount == 1) {
                    if (alertWarranted) {
                        workers.alertUserToStatusChange(newCheckData);
                    } else {
                        console.log("Check outcome has not changed, no alert needed");
                    }
                } else {
                    console.log("Failed to update the check data.");
                }
            }
        });
    },
    alertUserToStatusChange: (newCheckData) => {
        var msg = 'Alert: Your check for ' + newCheckData.method.toUpperCase() + ' ' + newCheckData.protocol + '://' + newCheckData.url + ' is currently ' + newCheckData.state;
        helpers.sendTwilioSMS(newCheckData.phoneNumber, msg, function (err) {
            if (!err) {
                console.log("Success: User was alerted to a status change in their check, via sms: ", msg);
            } else {
                console.log("Error: Could not send sms alert to user who had a state change in their check", err);
            }
        });
    },
    loop: () => {
        setInterval(() => {
            workers.gatherAllChecks();
        }, 1000 * 60);
    }
}

module.exports = workers;