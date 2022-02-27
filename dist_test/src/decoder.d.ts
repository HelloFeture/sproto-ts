import { Type } from "./meta";
import { ITypeProvider } from "./coder";
export declare class Decoder<T = any> {
    private type;
    private provider;
    private view;
    private headerOffset;
    private dataOffset;
    private tag;
    constructor(type: Type, data: ArrayBuffer | Uint8Array, provider: ITypeProvider);
    decode(): T | Error;
    private checkTag;
    private preCheck;
    private popBoolean;
    private popInteger;
    private decInteger;
    private decInteger64;
    private popDouble;
    private popString;
    private popStruct;
    private popBooleans;
    private popIntegers;
    private popDoubles;
    private popStrings;
    private popStructs;
}
