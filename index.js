const http = require("http");
const https = require("https");
const url = require("url");
const fs = require("fs");
const config = require("./config");
const handlers = require("./libs/handlers");
const {
    StringDecoder
} = require("string_decoder");


const mongoUtil = require("./libs/mongoUtil");
mongoUtil.connect()

const router = {
    "ping": handlers.ping,
    "users": handlers.users
};

const httpServer = http.createServer((req, res) => {
    unifiedServer(req, res);
});

httpServer.listen(config.httpPort, () => console.log("HTTP Server is listening on port", config.httpPort, "on", config.name, "mode"));

const httpsServerOptions = {
    key: fs.readFileSync("./https/key.pem"),
    cert: fs.readFileSync("./https/cert.pem")
}

const httpsServer = https.createServer(httpsServerOptions, (req, res) => {
    unifiedServer(req, res);
});

httpsServer.listen(config.httpsPort, () => console.log("HTTPS Server is listening on port", config.httpsPort, "on", config.name, "mode"));

const unifiedServer = (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g, "");
    const method = req.method.toLowerCase();
    const queryStringObject = parsedUrl.query;
    const headers = req.headers;
    const decoder = new StringDecoder("utf-8");
    let buffer = "";
    req.on("data", chunk => buffer += decoder.write(chunk));
    req.on("end", () => {
        buffer += decoder.end();
        const chosenHandler = typeof (router[trimmedPath]) !== "undefined" ? router[trimmedPath] : handlers.notFound;
        let payload;
        try {
           payload = JSON.parse(buffer);
        }catch(error) {
            payload = {};
        }
        const data = {
            trimmedPath,
            method,
            headers,
            payload
        }
        chosenHandler(data, (statusCode, payload) => {
            statusCode = typeof (statusCode) == "number" ? statusCode : 200;
            payload = typeof(payload) == "object"? payload: {};
            res.setHeader("Content-Type", "application/json");
            res.writeHead(statusCode);
            res.end(JSON.stringify(payload));
        });
    })
}