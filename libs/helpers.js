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
    }
}

module.exports = helpers;