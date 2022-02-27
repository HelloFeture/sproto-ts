/**
 * sproto type definition
 */
export declare enum eType {
    Integer = 0,
    Boolean = 1,
    String = 2,
    Struct = 3,
    Double = 4
}
/**
 * type's string value
 */
export declare enum eTypeString {
    Integer = "integer",
    Boolean = "boolean",
    String = "string",
    Double = "double"
}
export declare function toTypeString(t: eType): string;
export declare function toType(t: string): eType;
/**
 * field information
 */
export declare class Field {
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
    get isStruct(): boolean;
    /** extra, ie: interger(4) */
    extra: string | number;
    /**
     * contractor
     * @param name name of the field
     */
    constructor(name: string);
    /**
     * print field information
     */
    dump(): void;
}
/**
 * user defined type
 */
export declare class Type {
    /** struct name */
    name: string;
    /** struct's fileds */
    fileds: Array<Field>;
    private _maxTag;
    get maxTag(): number;
    constructor(name: string);
    addField(field: Field): Error;
    findFieldByTag(tag: number): Field | undefined;
    findFieldByName(name: string): Field | undefined;
    dump(): void;
}
/**
 * user defined protocol
 */
export declare class Protocol {
    tag: number;
    name: string;
    request: Type | undefined;
    response: Type | undefined;
    constructor(name: string);
    dump(): void;
}
export declare enum eSize {
    Header = 2,
    Field = 2,
    DataLength = 4,
    Double = 8,
    Buffer = 4096,
    MaxFieldCount = 65535
}
export declare function isNull<T>(v: T): boolean;
