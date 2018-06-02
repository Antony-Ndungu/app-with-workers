const path = require("path");
const fs = require("fs");
const zlib = require("zlib");

const logs = {
    baseDir: path.join(__dirname, "../.logs/"),
    append: (file, str, callback) => {
        fs.open(logs.baseDir + file + ".log", "a", (err, fileDescriptor) => {
            if(!err && fileDescriptor){
                fs.appendFile(fileDescriptor, str + "\n", err => {
                    if(err){
                        callback("Error appending to file.");
                    }else{
                        fs.close(fileDescriptor, err => {
                            if(err){
                                callback("Error closing the file that was being appended to.");
                            }else{
                                callback(false);
                            }
                        });
                    }
                })
            }else{
                callback("Could not open file for appending.");
            }
        });
    },
    list: (includeCompressedFiles, callback) => {
        fs.readdir(logs.baseDir, (err, data) => {
            if(!err && data && data.length > 0){
                let trimmedFileNames = [];
                data.forEach(fileName => {
                    //Add .log files
                    if(fileName.indexOf(".log") > -1){
                        trimmedFileNames.push(fileName.replace(".log", ""));

                    }
                    //Add .gz files
                    if(fileName.indexOf(".gz.b64") > -1 && includeCompressedFiles){
                        trimmedFileNames.push(fileName.replace(".gz.b64", ""));
                    }
                    callback(false, trimmedFileNames);
                });
            }else{
                callback(err)
            }
        });
    },
    compress: (logId, newFileId, callback) => {
        let sourceFile = logId + ".log";
        let destFile = newFileId + ".gz.b64";
        //Read the source file
        fs.readFile(logs.baseDir + sourceFile, "utf8", (err, inputString) => {
            if(err){
                callback(err);
            }else{
                zlib.gzip(inputString, (err, buffer) => {
                    if(err || !buffer){
                        callback(err);
                    }else{
                        fs.open(logs.baseDir + destFile, "wx", (err, fileDescriptor) => {
                            if(err || !fileDescriptor){
                                callback(err);
                            }else{
                                fs.writeFile(fileDescriptor, buffer.toString("base64"), err => {
                                    if(err){
                                        callback(err);
                                    }else{
                                        fs.close(fileDescriptor, (err) => {
                                            if(err){
                                                callback(err);
                                            }else{
                                                callback(false);
                                            }
                                        })
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    },
    decompres: (fileId, callback) => {
        let fileName = fileId + ".gz.b64";
        fs.readFile(lib.baseDir + fileName + "utf8", (err, inputString) => {
            if(!err && inputString){
                let inputBuffer = Buffer.from(inputString, "base64");
                zlib.unzip(inputBuffer, (err, outputBuffer) => {
                    if(!err && outputBuffer){
                        callback(false, outputBuffer.toString());
                    }else{
                        callback(err);
                    }
                });
            }else{
                callback(err);
            }
        });
    },
    truncate: (logId, callback) => {
        fs.truncate(logs.baseDir + logId + ".log", 0, err => {
            if(err){
                callback(err);
            }else{
                callback(false);
            }
        });
    }
}

module.exports = logs;