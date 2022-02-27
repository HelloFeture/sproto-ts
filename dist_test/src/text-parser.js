"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextParser = void 0;
const meta_1 = require("./meta");
const sproto_1 = require("./sproto");
// 类型
// string
// binary (string)
// interger 
// interger(n)
// double ieee 754 
// boolean
// * 数组
// unordered map 
// Each integer number must be serialized in little-endian format.
// The header, the field part, and the data part. 
//////////////////////////////////////////////////////////////
function isNewLine(c) {
    return c === "\n";
}
function isAlphabet(c) {
    return /^[a-zA-Z]*$/.test(c);
}
function isAlphanumeric(c) {
    // [A-Za-z0-9_]
    return /^\w*$/.test(c);
}
function isSpace(c) {
    return /^\s*$/.test(c);
}
function isNumeric(c) {
    return /^[0-9]*$/.test(c);
}
function isComment(c) {
    return c === "#";
}
function isReqOrResp(c) {
    return /[requestpon]/.test(c);
}
//////////////////////////////////////////////////////////
class ParseState {
    constructor(sproto, text) {
        this.text = text;
        this.index = 0;
        this.line = 1;
        this.col = 0;
        this.lineText = "";
        this.sproto = sproto;
    }
    getErrorInfo() {
        return `syntax error on line ${this.line} column ${this.col}, near ${this.lineText}`;
    }
    newChar(c) {
        if (isNewLine(c)) {
            this.line++;
            this.col = 0;
            this.lineText = "";
        }
        else {
            this.col++;
            this.lineText += c;
        }
    }
    skipComment() {
        let c;
        while (this.index < this.text.length) {
            c = this.text[this.index];
            this.newChar(c);
            if (isNewLine(c)) {
                return;
            }
            this.index++;
        }
    }
}
class ParseBase {
    constructor(state) {
        this.state = state;
    }
}
class ParseField extends ParseBase {
    constructor(name, state) {
        super(state);
        this.name = name;
        this.tag = "";
        this._field = new meta_1.Field(name);
    }
    get field() {
        return this._field;
    }
    parse() {
        this.status = ParseField.ST_Need_Tag;
        let c;
        let err;
        while (this.state.index < this.state.text.length) {
            c = this.state.text[this.state.index];
            this.state.newChar(c);
            switch (this.status) {
                case ParseField.ST_Need_Tag:
                    err = this.onNeedTag(c);
                    if (err) {
                        return err;
                    }
                    break;
                case ParseField.ST_Need_Colon:
                    err = this.onNeedColon(c);
                    if (err) {
                        return err;
                    }
                    break;
                case ParseField.ST_Need_Type:
                    err = this.onNeedType(c);
                    if (err) {
                        return err;
                    }
                    break;
                case ParseField.ST_Need_Close:
                    err = this.onNeedClose(c);
                    if (err) {
                        return err;
                    }
                    break;
                case ParseField.ST_Need_Type_Extra:
                    err = this.onNeedTypeExtra(c);
                    if (err) {
                        return err;
                    }
                    break;
                case ParseField.ST_Need_Type_Extra_Close:
                    err = this.ononNeedTypeExtraClose(c);
                    if (err) {
                        return err;
                    }
                    break;
                default:
                    return new Error(this.name + " [parse field] unkown status");
            }
            if (this.isClose) {
                return this.checkField();
            }
            this.state.index++;
        }
        return new Error(` [parse field] unexpected end of field ${this.name}`);
    }
    skipComment() {
        this.state.skipComment();
        return undefined;
    }
    onNeedTag(c) {
        if (this.tag.length == 0) {
            if (isSpace(c)) {
                return undefined;
            }
            if (isComment(c)) {
                return this.skipComment();
            }
            if (!isNumeric(c)) {
                let msg = this.state.getErrorInfo();
                return new Error(msg + "[parse tag] invalid char : " + c);
            }
            this.tag += c;
            return undefined;
        }
        if (isSpace(c)) {
            this.status = ParseField.ST_Need_Colon;
            return undefined;
        }
        if (isComment(c)) {
            this.status = ParseField.ST_Need_Colon;
            return this.skipComment();
        }
        if (c === ":") {
            return this.onNeedColon(c);
        }
        if (!isNumeric(c)) {
            let msg = this.state.getErrorInfo();
            return new Error(msg + " [parse tag] invalid char  : " + c);
        }
        this.tag += c;
    }
    onNeedColon(c) {
        if (c === ":") {
            this.status = ParseField.ST_Need_Type;
            this.typeName = "";
            this.isArray = false;
            return undefined;
        }
        if (isSpace(c)) {
            return undefined;
        }
        if (isComment(c)) {
            return this.skipComment();
        }
        let msg = this.state.getErrorInfo();
        return new Error(msg + " [parse colon] invalid char : " + c);
    }
    onNeedType(c) {
        if (this.typeName.length == 0) {
            if (isSpace(c)) {
                return undefined;
            }
            if (isComment(c)) {
                return this.skipComment();
            }
            if (c === "*") {
                this.isArray = true;
            }
            else if (!isAlphabet(c)) {
                let msg = this.state.getErrorInfo();
                return new Error(msg + " [parse field type] invalid char : " + c);
            }
            this.typeName += c;
            return undefined;
        }
        if (c === "(") {
            this.status = ParseField.ST_Need_Type_Extra;
            this.extra = "";
            return this.checkType();
        }
        if (isComment(c)) {
            this.state.index--;
            this.isClose = true;
            return this.checkType();
        }
        if (isSpace(c)) {
            this.isClose = true;
            return this.checkType();
        }
        if (!isAlphanumeric(c)) {
            let msg = this.state.getErrorInfo();
            return new Error(msg + " [parse field type] invalid char : " + c);
        }
        this.typeName += c;
        return undefined;
    }
    checkType() {
        if (this.isArray && this.typeName.length <= 1) {
            let msg = this.state.getErrorInfo();
            return new Error(msg + " [parse field type] invalid field type" + this.typeName);
        }
        return undefined;
    }
    onNeedTypeExtra(c) {
        if (this.extra.length == 0) {
            if (isSpace(c)) {
                return undefined;
            }
            if (isComment(c)) {
                return this.skipComment();
            }
            if (!isAlphanumeric(c)) {
                let msg = this.state.getErrorInfo();
                return new Error(msg + " [parse extra] invalid char " + c);
            }
            this.extra += c;
            return undefined;
        }
        if (isSpace(c)) {
            this.status = ParseField.ST_Need_Type_Extra_Close;
            return undefined;
        }
        if (isComment(c)) {
            this.status = ParseField.ST_Need_Type_Extra_Close;
            return this.skipComment();
        }
        if (c === ")") {
            this.status = ParseField.ST_Need_Close;
            return undefined;
        }
        if (!isAlphanumeric(c)) {
            let msg = this.state.getErrorInfo();
            return new Error(msg + " [parse extra] invalid char: " + c);
        }
        this.extra += c;
        return undefined;
    }
    ononNeedTypeExtraClose(c) {
        if (isSpace(c)) {
            return undefined;
        }
        if (isComment(c)) {
            return this.skipComment();
        }
        if (c === ")") {
            this.status = ParseField.ST_Need_Close;
            return undefined;
        }
        let msg = this.state.getErrorInfo();
        return new Error(msg + " [parse extra] invalid char: " + c);
    }
    onNeedClose(c) {
        if (isSpace(c)) {
            this.isClose = true;
            return undefined;
        }
        if (c === "#" || c === "}") {
            this.isClose = true;
            this.state.index--;
            return undefined;
        }
        let msg = this.state.getErrorInfo();
        return new Error(msg + " invalid char : " + c);
    }
    checkField() {
        this.typeName = this.typeName.replace("*", "");
        let tp = (0, meta_1.toType)(this.typeName);
        if (tp === meta_1.eType.Struct) {
            this.field.structName = this.typeName;
        }
        this.field.isArray = this.isArray;
        this.field.type = tp;
        this.field.tag = parseInt(this.tag);
        this.field.extra = this.extra;
        if (this.field.type === meta_1.eType.Integer && this.extra && this.extra.length > 0) {
            if (!isNumeric(this.extra)) {
                return new Error(`invalid fixed-point for ${this.name}`);
            }
            this.field.extra = parseInt(this.extra);
        }
        return undefined;
    }
}
ParseField.ST_Need_Tag = 0;
ParseField.ST_Need_Colon = 1;
ParseField.ST_Need_Type = 2;
ParseField.ST_Need_Close = 3;
ParseField.ST_Need_Type_Extra = 4;
ParseField.ST_Need_Type_Extra_Close = 5;
class ParseStruct extends ParseBase {
    constructor(name, state) {
        super(state);
        this.name = name;
        this.isClose = false;
        this.status = ParseStruct.ST_Need_Left_Brace;
        this.t = new meta_1.Type(name);
        this.internal = {};
    }
    get type() {
        return this.t;
    }
    parse() {
        let c;
        let err;
        while (this.state.index < this.state.text.length) {
            c = this.state.text[this.state.index];
            this.state.newChar(c);
            switch (this.status) {
                case ParseStruct.ST_Need_Left_Brace:
                    err = this.onNeedLeftBrace(c);
                    if (err) {
                        return err;
                    }
                    break;
                case ParseStruct.ST_Non:
                    err = this.onNon(c);
                    if (err) {
                        return err;
                    }
                    break;
                case ParseStruct.ST_Parse_Field_Name:
                    err = this.onParseFieldName(c);
                    if (err) {
                        return err;
                    }
                    break;
                case ParseStruct.ST_Parse_Struct_Name:
                    err = this.onParseStructName(c);
                    if (err) {
                        return err;
                    }
                    break;
                default:
                    return new Error(this.name + " [parse struct] unkown status");
            }
            if (this.isClose) {
                return this.state.sproto.addType(this.t);
            }
            this.state.index++;
        }
        return new Error(" [parse struct] could not find } for struct " + this.name);
    }
    onNeedLeftBrace(c) {
        if (isComment(c)) {
            return this.skipComment();
        }
        if (c === "{") {
            this.status = ParseStruct.ST_Non;
            return undefined;
        }
        if (isSpace(c)) {
            return undefined;
        }
        let msg = this.state.getErrorInfo();
        return new Error(msg + "  : " + c);
    }
    onNon(c) {
        if (isComment(c)) {
            return this.skipComment();
        }
        if (isSpace(c)) {
            return undefined;
        }
        if (c == ".") {
            this.status = ParseStruct.ST_Parse_Struct_Name;
            this.structName = "";
            return undefined;
        }
        if (isAlphabet(c)) {
            this.status = ParseStruct.ST_Parse_Field_Name;
            this.fieldName = c;
            return undefined;
        }
        if (c === "}") {
            this.isClose = true;
            return undefined;
        }
        let msg = this.state.getErrorInfo();
        return new Error(msg);
    }
    onParseFieldName(c) {
        if (this.fieldName.length == 0) {
            if (isSpace(c)) {
                return undefined;
            }
            if (isComment(c)) {
                return this.skipComment();
            }
            if (!isAlphabet(c)) {
                let msg = this.state.getErrorInfo();
                return new Error(msg);
            }
            this.fieldName += c;
            return undefined;
        }
        if (isComment(c)) {
            this.skipComment();
            return this.parseField();
        }
        if (isSpace(c)) {
            return this.parseField();
        }
        if (isAlphanumeric(c)) {
            this.fieldName += c;
            return undefined;
        }
        let msg = this.state.getErrorInfo();
        return new Error(msg + " [parse field name] invalid char : " + c);
    }
    parseField() {
        this.status = ParseStruct.ST_Non;
        let field = new ParseField(this.fieldName, this.state);
        let err = field.parse();
        if (err) {
            return err;
        }
        return this.addField(field);
    }
    onParseStructName(c) {
        if (this.structName.length == 0) {
            if (isSpace(c)) {
                return undefined;
            }
            if (!isAlphabet(c)) {
                let msg = this.state.getErrorInfo();
                return new Error(msg);
            }
            this.structName += c;
            return undefined;
        }
        if (isComment(c)) {
            return this.parseStruct();
        }
        if (isSpace(c)) {
            return this.parseStruct();
        }
        if (isAlphanumeric(c)) {
            this.structName += c;
            return undefined;
        }
        let msg = this.state.getErrorInfo();
        return new Error(msg + " [parse struct] invalid char  : " + c);
    }
    skipComment() {
        this.state.skipComment();
        return undefined;
    }
    parseStruct() {
        this.status = ParseStruct.ST_Non;
        this.internal[this.structName] = true;
        return new ParseStruct(this.name + "." + this.structName, this.state).parse();
    }
    addField(field) {
        let f = field.field;
        if (f.isStruct) {
            let name = f.structName;
            if (this.internal[name]) {
                let expandName = `${this.name}.${f.structName}`;
                if (!this.state.sproto.getTypeByName(expandName)) {
                    if (!this.state.sproto.getTypeByName(name)) {
                        return new Error(`in ${this.name} filed ${f.name} could not find type ${f.structName}`);
                    }
                }
                else {
                    f.structName = expandName;
                }
            }
            else {
                if (!this.state.sproto.getTypeByName(name)) {
                    if (this.name !== name) {
                        return new Error(`in ${this.name} filed ${f.name} could not find type ${f.structName}`);
                    }
                }
            }
        }
        return this.t.addField(f);
    }
}
ParseStruct.ST_Need_Left_Brace = 0;
ParseStruct.ST_Non = 1;
ParseStruct.ST_Parse_Field_Name = 2;
ParseStruct.ST_Parse_Struct_Name = 3;
class ParseProtocol extends ParseBase {
    constructor(name, state) {
        super(state);
        this.name = name;
        this.isClose = false;
        this.protocol = new meta_1.Protocol(name);
        // this.internal = {};
    }
    parse() {
        this.status = ParseProtocol.ST_Need_Tag;
        let c;
        let err;
        this.tag = "";
        while (this.state.index < this.state.text.length) {
            c = this.state.text[this.state.index];
            this.state.newChar(c);
            switch (this.status) {
                case ParseProtocol.ST_Need_Tag:
                    err = this.onNeedTag(c);
                    if (err) {
                        return err;
                    }
                    break;
                case ParseProtocol.ST_Need_Left_Brace:
                    err = this.onNeedLeftBrace(c);
                    if (err) {
                        return err;
                    }
                    break;
                case ParseProtocol.ST_Need_Req_Or_Resp:
                    err = this.onNeedReqOrResp(c);
                    if (err) {
                        return err;
                    }
                    break;
                default:
                    return new Error("unkown status");
            }
            if (this.isClose) {
                return this.addProtocol();
            }
            this.state.index++;
        }
        if (!this.isClose) {
            return new Error("unexpected EOF");
        }
        return undefined;
    }
    onNeedTag(c) {
        if (this.tag.length == 0) {
            if (isSpace(c)) {
                return undefined;
            }
            if (isComment(c)) {
                return this.skipComment();
            }
            if (!isNumeric(c)) {
                let msg = this.state.getErrorInfo();
                return new Error(msg + ` [prase protocol] invalid char : ${c}`);
            }
            this.tag += c;
            return undefined;
        }
        if (isSpace(c)) {
            this.status = ParseProtocol.ST_Need_Left_Brace;
            return undefined;
        }
        if (isComment(c)) {
            this.status = ParseProtocol.ST_Need_Left_Brace;
            return this.skipComment();
        }
        if (c === "{") {
            this.reqOrResp = "";
            this.status = ParseProtocol.ST_Need_Req_Or_Resp;
            return undefined;
        }
        if (!isNumeric(c)) {
            let msg = this.state.getErrorInfo();
            return new Error(msg + ` [prase protocol] invalid char : ${c}`);
        }
        this.tag += c;
        return undefined;
    }
    onNeedLeftBrace(c) {
        if (isSpace(c)) {
            return undefined;
        }
        if (isComment(c)) {
            return this.skipComment();
        }
        if (c === "{") {
            this.reqOrResp = "";
            this.status = ParseProtocol.ST_Need_Req_Or_Resp;
            return undefined;
        }
        let msg = this.state.getErrorInfo();
        return new Error(msg + ` [prase protocol] invalid char : ${c}`);
    }
    onNeedReqOrResp(c) {
        if (this.reqOrResp.length == 0) {
            if (isSpace(c)) {
                return undefined;
            }
            if (isComment(c)) {
                return this.skipComment();
            }
            if (c === "}") {
                return this.checkClose();
            }
            if (!isReqOrResp(c)) {
                let msg = this.state.getErrorInfo();
                return new Error(msg + ` [prase protocol] invalid char : ${c}`);
            }
            this.reqOrResp += c;
            return undefined;
        }
        if (isSpace(c)) {
            return this.parseReqOrResp();
        }
        if (isComment(c)) {
            return this.skipComment();
        }
        if (c === "{") {
            this.state.index--;
            return this.parseReqOrResp();
        }
        if (c === "}") {
            return this.checkClose();
        }
        if (!isReqOrResp(c)) {
            let msg = this.state.getErrorInfo();
            return new Error(msg + ` [prase protocol] invalid char : ${c}`);
        }
        this.reqOrResp += c;
        return undefined;
    }
    parseReqOrResp() {
        let isReq;
        if (this.reqOrResp == ParseProtocol.REQ) {
            isReq = true;
            if (this.protocol.request) {
                return new Error(`protocol ${this.name} duplicate define request`);
            }
        }
        else if (this.reqOrResp == ParseProtocol.RESP) {
            if (this.protocol.response) {
                return new Error(`protocol ${this.name} duplicate define response`);
            }
        }
        else {
            return new Error(`${this.name} invalid protocol ${this.reqOrResp}`);
        }
        let name = `${this.name}.${this.reqOrResp}`;
        let parser = new ParseStruct(name, this.state);
        let err = parser.parse();
        if (err instanceof Error) {
            return err;
        }
        if (isReq) {
            this.protocol.request = parser.type;
        }
        else {
            this.protocol.response = parser.type;
        }
        this.status = ParseProtocol.ST_Need_Req_Or_Resp;
        this.reqOrResp = "";
        return undefined;
    }
    checkClose() {
        this.isClose = true;
        return undefined;
    }
    addProtocol() {
        this.protocol.tag = parseInt(this.tag);
        return this.state.sproto.addProtocol(this.protocol);
    }
    skipComment() {
        this.state.skipComment();
        return undefined;
    }
}
ParseProtocol.ST_Need_Tag = 0;
ParseProtocol.ST_Need_Left_Brace = 1;
ParseProtocol.ST_Need_Req_Or_Resp = 2;
ParseProtocol.REQ = "request";
ParseProtocol.RESP = "response";
class Parse extends ParseBase {
    parse() {
        this.status = Parse.ST_Non;
        let c;
        let err;
        while (this.state.index < this.state.text.length) {
            c = this.state.text[this.state.index];
            this.state.newChar(c);
            switch (this.status) {
                case Parse.ST_Non:
                    err = this.onNon(c);
                    if (err) {
                        return err;
                    }
                    break;
                case Parse.ST_Parse_Struct_Name:
                    this.isHaveField = true;
                    err = this.onParseStructName(c);
                    if (err) {
                        return err;
                    }
                    break;
                case Parse.ST_Parse_Protocol_Name:
                    this.isHaveField = true;
                    err = this.onParseProtocolName(c);
                    if (err) {
                        return err;
                    }
                    break;
                default:
                    return new Error("unkown status");
            }
            this.state.index++;
        }
        if (this.status !== Parse.ST_Non) {
            return new Error("unexpected EOF");
        }
        if (!this.isHaveField) {
            return new Error("invalid sproto syntax");
        }
        return undefined;
    }
    onNon(c) {
        if (isComment(c)) {
            return this.skipComment();
        }
        if (isSpace(c)) {
            return undefined;
        }
        if (c == ".") {
            this.status = Parse.ST_Parse_Struct_Name;
            this.structName = "";
            return undefined;
        }
        if (isAlphabet(c)) {
            this.status = Parse.ST_Parse_Protocol_Name;
            this.protocolName = c;
            return undefined;
        }
        let msg = this.state.getErrorInfo();
        return new Error(msg);
    }
    onParseStructName(c) {
        if (this.structName.length == 0) {
            if (isSpace(c)) {
                return undefined;
            }
            if (isComment(c)) {
                return this.skipComment();
            }
            if (!isAlphabet(c)) {
                let msg = this.state.getErrorInfo();
                return new Error(msg);
            }
            this.structName += c;
            return undefined;
        }
        if (isComment(c)) {
            this.skipComment();
            return this.parseStruct();
        }
        if (isSpace(c)) {
            return this.parseStruct();
        }
        if (c === "{") {
            return this.parseStruct();
        }
        if (isAlphanumeric(c)) {
            this.structName += c;
            return undefined;
        }
        let msg = this.state.getErrorInfo();
        return new Error(msg + " invalid char of message key : " + c);
    }
    parseStruct() {
        this.status = Parse.ST_Non;
        return new ParseStruct(this.structName, this.state).parse();
    }
    onParseProtocolName(c) {
        if (isSpace(c)) {
            this.status = Parse.ST_Non;
            return new ParseProtocol(this.protocolName, this.state).parse();
        }
        if (isAlphanumeric(c)) {
            this.protocolName += c;
            return undefined;
        }
        let msg = this.state.getErrorInfo();
        return new Error(msg + " invalid char of message key : " + c);
    }
    skipComment() {
        this.state.skipComment();
        return undefined;
    }
}
Parse.ST_Non = 0;
Parse.ST_Parse_Struct_Name = 1;
Parse.ST_Parse_Protocol_Name = 2;
class TextParser {
    static parse(text) {
        let sp = new sproto_1.Sproto();
        let state = new ParseState(sp, text);
        let err = new Parse(state).parse();
        if (err instanceof Error) {
            return err;
        }
        return sp;
    }
}
exports.TextParser = TextParser;
