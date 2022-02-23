
import {
    Field,
    Type,
    toType,
    eType,
    Protocol,
} from "./meta";
import {
    Sproto
} from "./sproto";

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

function isNewLine(c: string): boolean {
    return c === "\n";
}

function isAlphabet(c: string): boolean {
    return /^[a-zA-Z]*$/.test(c);
}

function isAlphanumeric(c: string): boolean {
    // [A-Za-z0-9_]
    return /^\w*$/.test(c);
}

function isSpace(c: string): boolean {
    return /^\s*$/.test(c);
}

function isNumeric(c: string): boolean {
    return /^[0-9]*$/.test(c);
}

function isComment(c: string): boolean {
    return c === "#";
}

function isReqOrResp(c: string): boolean {
    return /[requestpon]/.test(c);
}

//////////////////////////////////////////////////////////

class ParseState {
    /** current index */
    index: number;
    /** current line */
    line: number;
    /** current line column */
    col: number;
    /** current line text */
    lineText: string;

    readonly text: string;
    readonly sproto: Sproto;
    constructor(sproto: Sproto, text: string) {
        this.text = text;
        this.index = 0;
        this.line = 1;
        this.col = 0;
        this.lineText = "";
        this.sproto = sproto;
    }

    public getErrorInfo(): string {
        return `syntax error on line ${this.line} column ${this.col}, near ${this.lineText}`;
    }

    public newChar(c: string): void {
        if (isNewLine(c)) {
            this.line++;
            this.col = 0;
            this.lineText = "";
        } else {
            this.col++;
            this.lineText += c;
        }
    }

    public skipComment(): void {
        let c: string;
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

abstract class ParseBase {
    protected state: ParseState;
    constructor(state: ParseState) {
        this.state = state;
    }

    abstract parse(): Error;
}


class ParseField extends ParseBase {
    private static readonly ST_Need_Tag = 0;
    private static readonly ST_Need_Colon = 1;
    private static readonly ST_Need_Type = 2;
    private static readonly ST_Need_Close = 3;
    private static readonly ST_Need_Type_Extra = 4;
    private static readonly ST_Need_Type_Extra_Close = 5;
    
    private name: string;
    private status: number;
    private isArray: boolean;
    private isClose: boolean;
    private tag: string;
    private typeName: string;
    private extra: string;
    private _field: Field;
    public get field(): Field {
        return this._field;
    }
    
    constructor(name: string, state: ParseState) {
        super(state);
        this.name = name;
        this.tag = "";
        this._field = new Field(name);
    }

    public parse():Error {
        this.status = ParseField.ST_Need_Tag;
        let c: string;
        let err: Error;
        while (this.state.index < this.state.text.length) {
            c = this.state.text[this.state.index];
            this.state.newChar(c);

            switch (this.status) {
                case ParseField.ST_Need_Tag:
                    err = this.onNeedTag(c);
                    if (err) {return err;}
                    break;
                case ParseField.ST_Need_Colon:
                    err = this.onNeedColon(c);
                    if (err) {return err;}
                    break;
                case ParseField.ST_Need_Type:
                    err = this.onNeedType(c);
                    if (err) {return err;}
                    break;
                case ParseField.ST_Need_Close:
                    err = this.onNeedClose(c);
                    if (err) {return err;}
                    break;
                case ParseField.ST_Need_Type_Extra:
                    err = this.onNeedTypeExtra(c);
                    if (err) {return err;}
                    break;
                case ParseField.ST_Need_Type_Extra_Close:
                    err = this.ononNeedTypeExtraClose(c);
                    if (err) {return err;}
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

    private skipComment(): Error {
        this.state.skipComment();
        return undefined;
    }

    private onNeedTag(c: string): Error {
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

    private onNeedColon(c: string): Error {
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

    private onNeedType(c: string): Error {
        if (this.typeName.length == 0) {
            if (isSpace(c)) {
                return undefined;
            }
            if (isComment(c)) {
                return this.skipComment();
            }

            if (c === "*") {
                this.isArray = true;
            } else if (!isAlphabet(c)) {
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

    private checkType(): Error {
        if (this.isArray && this.typeName.length <= 1) {
            let msg = this.state.getErrorInfo();
            return new Error(msg + " [parse field type] invalid field type" + this.typeName);
        }

        return undefined;
    }

    private onNeedTypeExtra(c: string): Error {
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

    private ononNeedTypeExtraClose(c: string): Error {
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

    private onNeedClose(c: string): Error {
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

    private checkField(): Error {
        this.typeName = this.typeName.replace("*", "");
        let tp = toType(this.typeName);
        if (tp === eType.Struct) {
            this.field.structName = this.typeName;
        }
        
        this.field.isArray = this.isArray;
        this.field.type = tp;
        this.field.tag = parseInt(this.tag);
        this.field.extra = this.extra;
        if (this.field.type === eType.Integer && this.extra && this.extra.length > 0) {
            if (!isNumeric(this.extra)) {
                return new Error(`invalid fixed-point for ${this.name}`);
            }
            this.field.extra = parseInt(this.extra);
        }

        return undefined;
    }
}

class ParseStruct extends ParseBase {
    private static readonly ST_Need_Left_Brace = 0;
    private static readonly ST_Non = 1;
    private static readonly ST_Parse_Field_Name = 2;
    private static readonly ST_Parse_Struct_Name = 3;

    private isClose: boolean;
    private name: string;
    private status: number;
    private structName: string;
    private fieldName: string;
    private t: Type;
    public get type(): Type {
        return this.t;
    }
    private internal: {[key: string]:boolean};

    constructor(name: string, state: ParseState){
        super(state);
        this.name = name;
        this.isClose = false;
        this.status = ParseStruct.ST_Need_Left_Brace;
        this.t = new Type(name);
        this.internal = {};
    }

    parse():Error {
        let c: string;
        let err: Error;

        while (this.state.index < this.state.text.length) {
            c = this.state.text[this.state.index];
            this.state.newChar(c);

            switch (this.status) {
                case ParseStruct.ST_Need_Left_Brace:
                    err = this.onNeedLeftBrace(c);
                    if (err) {return err;}
                    break;
                case ParseStruct.ST_Non:
                    err = this.onNon(c);
                    if (err) {return err;}
                    break;
                case ParseStruct.ST_Parse_Field_Name:
                    err = this.onParseFieldName(c);
                    if (err) {return err;}
                    break;
                case ParseStruct.ST_Parse_Struct_Name:
                    err = this.onParseStructName(c);
                    if (err) {return err;}
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

    private onNeedLeftBrace(c: string): Error {
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

    private onNon(c: string): Error {
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

    private onParseFieldName(c: string): Error {
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

    private parseField(): Error {
        this.status = ParseStruct.ST_Non;
        let field = new ParseField(this.fieldName, this.state);
        let err = field.parse();
        if (err) {
            return err;
        }
        return this.addField(field);
    }

    private onParseStructName(c: string): Error {
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

    private skipComment(): Error {
        this.state.skipComment();
        return undefined;
    }

    private parseStruct(): Error {
        this.status = ParseStruct.ST_Non;
        this.internal[this.structName] = true;
        return new ParseStruct(this.name + "." + this.structName, this.state).parse();
    }

    private addField(field: ParseField): Error {
        let f = field.field;
        if (f.isStruct) {
            let name = f.structName;
            if (this.internal[name]) {
                let expandName = `${this.name}.${f.structName}`;
                if (!this.state.sproto.getTypeByName(expandName)) {
                    if (!this.state.sproto.getTypeByName(name)) {
                        return new Error(`in ${this.name} filed ${f.name} could not find type ${f.structName}`);
                    }
                } else {
                    f.structName = expandName;
                }
            } else {
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

class ParseProtocol extends ParseBase {
    private static readonly ST_Need_Tag = 0;
    private static readonly ST_Need_Left_Brace = 1;
    private static readonly ST_Need_Req_Or_Resp = 2;
    private static readonly REQ = "request";
    private static readonly RESP = "response";
   
    private name: string;
    private isClose: boolean;
    private status: number;
    private protocol: Protocol;
    private tag: string;
    private reqOrResp: string;
    
    constructor(name: string, state: ParseState){
        super(state);
        this.name = name;
        this.isClose = false;
        
        this.protocol = new Protocol(name);
        // this.internal = {};
    }
    parse():Error {
        this.status = ParseProtocol.ST_Need_Tag;

        let c: string;
        let err: Error;
        this.tag = "";
        while (this.state.index < this.state.text.length) {
            c = this.state.text[this.state.index];
            this.state.newChar(c);

            switch (this.status) {
                case ParseProtocol.ST_Need_Tag:
                    err = this.onNeedTag(c);
                    if (err) {return err;}
                    break;
                case ParseProtocol.ST_Need_Left_Brace:
                    err = this.onNeedLeftBrace(c);
                    if (err) {return err;}
                    break;
                case ParseProtocol.ST_Need_Req_Or_Resp:
                    err = this.onNeedReqOrResp(c);
                    if (err) {return err;}
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

    private onNeedTag(c: string): Error {
        
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

    private onNeedLeftBrace(c: string): Error {
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

    private onNeedReqOrResp(c: string): Error {
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

    private parseReqOrResp(): Error {
        let isReq: boolean;
        if (this.reqOrResp == ParseProtocol.REQ) {
            isReq = true;
            if (this.protocol.request) {
                return new Error(`protocol ${this.name} duplicate define request`);
            }
        } else if (this.reqOrResp == ParseProtocol.RESP) {
            if (this.protocol.response) {
                return new Error(`protocol ${this.name} duplicate define response`);
            }
        } else {
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
        } else {
            this.protocol.response = parser.type;
        }
        this.status = ParseProtocol.ST_Need_Req_Or_Resp;
        this.reqOrResp = "";
        return undefined;
    }

    private checkClose(): Error {
        this.isClose = true;
        return undefined;
    }

    private addProtocol(): Error {
        this.protocol.tag = parseInt(this.tag);
        return this.state.sproto.addProtocol(this.protocol);
    }

    private skipComment(): Error {
        this.state.skipComment();
        return undefined;
    }
}

class Parse extends ParseBase {
    private static readonly ST_Non = 0;
    private static readonly ST_Parse_Struct_Name = 1;
    private static readonly ST_Parse_Protocol_Name = 2;
  
    private isHaveField: boolean;
    private status: number;
    private structName: string;
    private protocolName: string;

    parse():Error {
        this.status = Parse.ST_Non;
        let c: string;
        let err: Error;
        while (this.state.index < this.state.text.length) {
            c = this.state.text[this.state.index];
            this.state.newChar(c);

            switch (this.status) {
                case Parse.ST_Non:
                    err = this.onNon(c);
                    if (err) {return err;}
                    break;
                case Parse.ST_Parse_Struct_Name:
                    this.isHaveField = true;
                    err = this.onParseStructName(c);
                    if (err) {return err;}
                    break;
                case Parse.ST_Parse_Protocol_Name:
                    this.isHaveField = true;
                    err = this.onParseProtocolName(c);
                    if (err) {return err;}
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

    private onNon(c: string): Error {
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

    private onParseStructName(c: string): Error {
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
        if (isSpace(c) ) {
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

    private parseStruct(): Error {
        this.status = Parse.ST_Non;
        return new ParseStruct(this.structName, this.state).parse();
    }

    private onParseProtocolName(c: string): Error {
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

    private skipComment(): Error {
        this.state.skipComment();
        return undefined;
    }
}


export class TextParser {
    constructor(){
    }

    parse(sp: Sproto, text: string): Error {
        let state = new ParseState(sp, text);
        return new Parse(state).parse();
    }
}
