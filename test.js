const { sendTwilioSMS } = require("./libs/helpers");

sendTwilioSMS("710860780", "Hey there, I am now using Twilio", error => {
    console.log(error);
})