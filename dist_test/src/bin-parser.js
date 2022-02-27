"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
var eSize;
(function (eSize) {
    eSize[eSize["length"] = 4] = "length";
    eSize[eSize["header"] = 2] = "header";
    eSize[eSize["field"] = 2] = "field";
})(eSize || (eSize = {}));
class BinParser {
    parse(sp, bin) {
        let offset = 0;
        return undefined;
    }
}
class Sproto {
    constructor() { }
    static fromBin(bin) {
        let sp = new Sproto();
        let parser = new BinParser();
        let err = parser.parse(sp, bin);
        if (err) {
            return err;
        }
        return sp;
    }
}
let data = fs.readFileSync("./protocol.spb");
let sp = Sproto.fromBin(data);
if (sp instanceof Error) {
    console.error(sp);
}
else {
    console.log("parser success");
}
