"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNull = exports.eSize = exports.Protocol = exports.Type = exports.Field = exports.toType = exports.toTypeString = exports.eTypeString = exports.eType = void 0;
/**
 * sproto type definition
 */
var eType;
(function (eType) {
    // interger or interger(n)
    eType[eType["Integer"] = 0] = "Integer";
    // boolean
    eType[eType["Boolean"] = 1] = "Boolean";
    // string
    eType[eType["String"] = 2] = "String";
    // struct
    eType[eType["Struct"] = 3] = "Struct";
    // double
    eType[eType["Double"] = 4] = "Double";
})(eType = exports.eType || (exports.eType = {}));
/**
 * type's string value
 */
var eTypeString;
(function (eTypeString) {
    eTypeString["Integer"] = "integer";
    eTypeString["Boolean"] = "boolean";
    eTypeString["String"] = "string";
    eTypeString["Double"] = "double";
})(eTypeString = exports.eTypeString || (exports.eTypeString = {}));
function toTypeString(t) {
    if (t === eType.Integer) {
        return eTypeString.Integer;
    }
    if (t === eType.String) {
        return eTypeString.String;
    }
    if (t === eType.Boolean) {
        return eTypeString.Boolean;
    }
    if (t === eType.Struct) {
        return "struct";
    }
    if (t === eType.Double) {
        return eTypeString.Double;
    }
    return "unkown";
}
exports.toTypeString = toTypeString;
function toType(t) {
    if (t === eTypeString.Integer) {
        return eType.Integer;
    }
    if (t === eTypeString.Double) {
        return eType.Double;
    }
    if (t === eTypeString.Boolean) {
        return eType.Boolean;
    }
    if (t === eTypeString.String) {
        return eType.String;
    }
    return eType.Struct;
}
exports.toType = toType;
/**
 * field information
 */
class Field {
    /**
     * contractor
     * @param name name of the field
     */
    constructor(name) {
        this.name = name;
    }
    get isStruct() {
        return this.type === eType.Struct;
    }
    /**
     * print field information
     */
    dump() {
        let info = `[${this.tag}] ${this.name}:${toTypeString(this.type)}`;
        if (this.type === eType.Struct) {
            info += ` ${this.structName}`;
        }
        if (this.isArray) {
            info += " []";
        }
        console.log("", info);
    }
}
exports.Field = Field;
/**
 * user defined type
 */
class Type {
    constructor(name) {
        this.name = name;
        this.fileds = [];
        this._maxTag = 0;
    }
    get maxTag() {
        return this._maxTag;
    }
    addField(field) {
        for (let item of this.fileds) {
            if (item.tag === field.tag) {
                return new Error(`${this.name} duplicate tag ${field.tag}`);
            }
            if (item.name === field.name) {
                return new Error(`${item.name} exists in ${this.name} `);
            }
        }
        if (this._maxTag < field.tag) {
            this._maxTag = field.tag;
        }
        this.fileds.push(field);
        this.fileds.sort((a, b) => {
            return a.tag - b.tag;
        });
    }
    findFieldByTag(tag) {
        for (let item of this.fileds) {
            if (item.tag === tag) {
                return item;
            }
        }
        return undefined;
    }
    findFieldByName(name) {
        for (let item of this.fileds) {
            if (item.name === name) {
                return item;
            }
        }
        return undefined;
    }
    dump() {
        console.log("-------------------------------");
        console.log(`${this.name}`);
        for (let item of this.fileds) {
            item.dump();
        }
    }
}
exports.Type = Type;
/**
 * user defined protocol
 */
class Protocol {
    constructor(name) {
        this.name = name;
    }
    dump() {
        console.log("-------------------------------");
        console.log(`${this.name} ${this.tag}`);
        if (this.request) {
            console.log("request ", this.request.name);
        }
        if (this.response) {
            console.log("response ", this.response.name);
        }
    }
}
exports.Protocol = Protocol;
var eSize;
(function (eSize) {
    eSize[eSize["Header"] = 2] = "Header";
    eSize[eSize["Field"] = 2] = "Field";
    eSize[eSize["DataLength"] = 4] = "DataLength";
    eSize[eSize["Double"] = 8] = "Double";
    eSize[eSize["Buffer"] = 4096] = "Buffer";
    eSize[eSize["MaxFieldCount"] = 65535] = "MaxFieldCount";
})(eSize = exports.eSize || (exports.eSize = {}));
function isNull(v) {
    return v === null || v === undefined;
}
exports.isNull = isNull;
