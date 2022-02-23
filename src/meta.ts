

/**
 * sproto type definition
 */
export enum eType {
    // interger or interger(n)
    Integer,
    // boolean
    Boolean,
    // string
    String,
    // struct
    Struct,
    // double
    Double,
}


/**
 * type's string value
 */
export enum eTypeString {
    Integer = "integer",
    Boolean = "boolean",
    String = "string",
    Double = "double",
}


export function toTypeString(t: eType): string {
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


export function toType(t: string): eType {
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


/**
 * field information
 */
export class Field {
    /** name of the field */
    name: string;
    /** weather this field is array */
    isArray: boolean;
    /** the field tag */
    tag: number;
    /** type */
    type: eType;
    /** for struct */
    structName: string;
    public get isStruct(): boolean {
        return this.type === eType.Struct;
    }
    /** extra, ie: interger(4) */
    extra: string | number;
    /**
     * contractor
     * @param name name of the field 
     */
    constructor(name: string) {
        this.name = name;
    }

    /**
     * print field information
     */
    public dump(): void {
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


/**
 * user defined type
 */
export class Type {
    /** struct name */
    public name: string;
    /** struct's fileds */
    public fileds: Array<Field>;

    private _maxTag: number;
    public get maxTag(): number {
        return this._maxTag;
    }
    constructor(name: string) {
        this.name = name;
        this.fileds = [];
        this._maxTag = 0;
    }

    public addField(field: Field): Error {
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
        this.fileds.sort((a: Field, b: Field) => {
            return a.tag - b.tag;
        });
    }

    public findFieldByTag(tag: number): Field | undefined {
        for (let item of this.fileds) {
            if (item.tag === tag) {
                return item;
            }
        }
        return undefined;
    }

    public findFieldByName(name: string): Field | undefined {
        for (let item of this.fileds) {
            if (item.name === name) {
                return item;
            }
        }
        return undefined;
    }

    public dump(): void {
        console.log("-------------------------------");
        console.log(`${this.name}`);
        for (let item of this.fileds) {
            item.dump();
        }
    }
}


/**
 * user defined protocol
 */
export class Protocol {
    tag: number;
    name: string;
    request: Type | undefined;
    response: Type | undefined;
    constructor(name: string) {
        this.name = name;
    }

    public dump(): void {
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

export enum eSize {
    Header = 2,
    Field = 2,

    DataLength = 4,
    Double = 8,

    Buffer = 4096,

    MaxFieldCount = 65535,
}


export function isNull<T>(v: T): boolean {
    return v === null || v === undefined;
}
