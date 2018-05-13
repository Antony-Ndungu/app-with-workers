                                        const environments = {
    staging: {
        httpPort: 3000,
        httpsPort: 3001,
        name: "staging",
        dbUrl: "mongodb://localhost:27017",
        secret: "feourenncdsnfdsa"
    },
    production: {
        httpPort: 5000,
        httpsPort: 5001,
        name: "production",
        dbUrl: "mongodb://localhost:27017",
        secret: "feourenncdsnfdsa"
    }
}

currentEnvironment = typeof(process.env.NODE_ENV) == "string"? process.env.NODE_ENV.toLowerCase(): '';
environmentToExport = typeof(environments[currentEnvironment]) == "object" ? environments[currentEnvironment]: environments.staging;
module.exports = environmentToExport;