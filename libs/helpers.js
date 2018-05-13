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
    }
}

module.exports = helpers;