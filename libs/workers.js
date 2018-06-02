const http = require("http");
const https = require("https");
const url = require("url");
const util = require("util");
const debug = util.debuglog("workers");
const _logs = require("./logs");
const helpers = require("./helpers");
const {
    ObjectID,
    ObjectId
} = require("mongodb");
const {
    getDb
} = require("./mongoUtil");

const workers = {
    //Init script
    init: () => {
        //Execute all checks immediately
        workers.gatherAllChecks();
        workers.loop();
        //Compress all log files immediately
        workers.rotateLogs();
        //Call the compression loop
        workers.logRotationLoop();
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
                debug("Could not find any check to process.");
            }
        }).catch(e => debug(e));
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
            debug("Error: one of the checks is not properly formatted. Skipping.");
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
        let timeOfCheck = Date.now();

        //log the outcome
        workers.log(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck);

        // Update the check data
        var newCheckData = originalCheckData;
        newCheckData.state = state;
        newCheckData.lastChecked = timeOfCheck;

        // Save the updates
        const db = getDb();
        db.collection("checks").updateOne({
            _id: originalCheckData._id
        }, {
            $set: newCheckData
        }, (err, result) => {
            if (err) {
                debug(err);
            } else {
                if (result.matchedCount == 1 && result.modifiedCount == 1) {
                    if (alertWarranted) {
                        workers.alertUserToStatusChange(newCheckData);
                    } else {
                        debug("Check outcome has not changed, no alert needed");
                    }
                } else {
                    debug("Failed to update the check data.");
                }
            }
        });
    },
    alertUserToStatusChange: (newCheckData) => {
        var msg = 'Alert: Your check for ' + newCheckData.method.toUpperCase() + ' ' + newCheckData.protocol + '://' + newCheckData.url + ' is currently ' + newCheckData.state;
        helpers.sendTwilioSMS(newCheckData.phoneNumber, msg, function (err) {
            if (!err) {
                debug("Success: User was alerted to a status change in their check, via sms: ", msg);
            } else {
                debug("Error: Could not send sms alert to user who had a state change in their check", err);
            }
        });
    },
    //Send log data to a log file
    log : (originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck) => {
        //Form log data
        let logData = {
            check: originalCheckData,
            outcome: checkOutcome,
            state,
            alert: alertWarranted,
            time: timeOfCheck
        }
        //Convert log data to a string
        let logString = JSON.stringify(logData);

        //Determine the name of the log file
        let fileName = originalCheckData._id;

        //Append the log string to file
        _logs.append(fileName, logString, err => {
            if(err){
                debug("Logging to fail failed.");
            }else{
                debug("Logging to file succeeded.");
            }
        })

    },
    logRotationLoop: () => {
        setInterval(() => {
            workers.rotateLogs();
        }, 24 * 60 * 60 * 100);
    },
    //compress log files
    rotateLogs: () => {
        //List all non-compressed files
        _logs.list(false, (err, logs) => {
            if(!err && logs && logs.length > 0){
                logs.forEach(logName => {
                    let logId = logName.replace(".log", "");
                    let newFileId = logId + "-" + Date.now();
                    _logs.compress(logId, newFileId, err => {
                        if(err){
                            debug("Error compressing one of the log files");
                        }else{
                            _logs.truncate(logId, err => {
                                if(err){
                                    debug("Error truncationg logfile");
                                }else{
                                    debug("Success truncating log file");
                                }
                            });
                        }
                    });
                });
            }else{
                debug("Could not find any logs to compress.");
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