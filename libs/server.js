const http = require("http");
const https = require("https");
const url = require("url");
const fs = require("fs");
const path = require("path");
const config = require("../config");
const handlers = require("./handlers");
const {
    StringDecoder
} = require("string_decoder");
const mongoUtil = require("./mongoUtil");

const server = {
    init: () => {
        server.httpServer.listen(config.httpPort, () => console.log("HTTP Server is listening on port", config.httpPort, "on", config.name, "mode"));
        server.httpsServer.listen(config.httpsPort, () => console.log("HTTPS Server is listening on port", config.httpsPort, "on", config.name, "mode"));                        
    },
    router: {
        "ping": handlers.ping,
        "users": handlers.users,
        "tokens": handlers.tokens,
        "checks": handlers.checks
    },
    unifiedServer: (req, res) => {
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
            const chosenHandler = typeof (server.router[trimmedPath]) !== "undefined" ? server.router[trimmedPath] : handlers.notFound;
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
                payload,
                query: queryStringObject
            }
            chosenHandler(data, (statusCode, payload) => {
                statusCode = typeof (statusCode) == "number" ? statusCode : 200;
                payload = typeof(payload) == "object"? payload: {};
                res.setHeader("Content-Type", "application/json");
                res.writeHead(statusCode);
                res.end(JSON.stringify(payload));
            });
        })
    },
    httpServer: http.createServer((req, res) => {
        server.unifiedServer(req, res);
    }),
    httpsServerOptions: {
        key: fs.readFileSync(path.join(__dirname, "../https/key.pem")),
        cert: fs.readFileSync(path.join(__dirname, "../https/key.pem"))
    },
    httpsServer:  https.createServer(this.httpsServerOptions, (req, res) => {
        server.unifiedServer(req, res);
    })
}

module.exports = server;