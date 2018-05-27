const https = require("https");
const querystring = require("querystring");
const config = require("../config");
let crypto;
try {
  crypto = require('crypto');
} catch (err) {
  console.log('crypto support is disabled!');
}

const helpers = {
    hash: str => {
        if(typeof(str) == "string" && str.length > 0){
            return crypto.createHmac("sha256", config.secret).update(str).digest("hex");
        }else{
            return false;
        }
    },
    createRamdomString: strLength => {
        strLength = typeof(strLength) == "number" && strLength > 0 ? strLength : false;
        if(strLength){
            let randomString = "";
            let possibleCharacters = "abcdefghijklmnopqrstuvwxyz0123456789";
            let randomCharacter;
            for(i = 0; i < strLength; i++){
                randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
                randomString += randomCharacter;
            }
            return randomString;
        }else{
            return false;
        }
    },
    sendTwilioSMS: (phoneNumber, message , callback) => {
        phoneNumber = typeof(phoneNumber) == "string" && phoneNumber.trim().length == 9 ? phoneNumber.trim() : false;
        message = typeof(message) == "string" && message.trim().length > 0 && message.trim().length < 1600 ? message.trim() : false;
        if(phoneNumber && message){
            let payload = {
                From : config.twilio.fromPhoneNumber,
                To: "+254" + phoneNumber,
                Body: message
            }
            let stringPayload = querystring.stringify(payload);

            let requestDetails = {
                protocol: "https:",
                host: "api.twilio.com",
                method: "POST",
                path: "/2010-04-01/Accounts/" + config.twilio.accountSid + "Messages",
                Auth: config.twilio.accountSid + ":" + config.twilio.authToken,
                headers: {
                    "Content-Type": "x-wwww-form-urlencoded",
                    "Content-Length": Buffer.byteLength(stringPayload)
                }
            }
            let req = https.request(requestDetails, (res) => {
                if(res.statusCode == 200 || 201){
                    callback(false);
                }else{
                    callback("The response statusCode is " + res.statusCode);
                }
            });

            req.on("error", error => {
                callback(error);
            })

            req.write(stringPayload);
            req.end();
        }else{
            callback("Missing required parameter(s) or the parameter(s) provided are invalid.");
        }
    }
}

module.exports = helpers;