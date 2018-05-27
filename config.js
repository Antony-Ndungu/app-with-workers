                                        const environments = {
    staging: {
        httpPort: 3000,
        httpsPort: 3001,
        name: "staging",
        dbUrl: "mongodb://localhost:27017",
        secret: "feourenncdsnfdsa",
        maxChecks: 5,
        twilio: {
            fromPhoneNumber: "+16513839026",
            accountSid: "ACff04c511fc5a0604f6f3a563bfa1a20d",
            authToken: "3c854eb3a1aacd2ecfa25964176fe75f"
        }
    },
    production: {
        httpPort: 5000,
        httpsPort: 5001,
        name: "production",
        dbUrl: "mongodb://localhost:27017",
        secret: "feourenncdsnfdsa",
        maxChecks: 5,
        twilio: {
            fromPhoneNumber: "",
            accountSid: "",
            authToken: ""
        }
    }
}

currentEnvironment = typeof(process.env.NODE_ENV) == "string"? process.env.NODE_ENV.toLowerCase(): '';
environmentToExport = typeof(environments[currentEnvironment]) == "object" ? environments[currentEnvironment]: environments.staging;
module.exports = environmentToExport;