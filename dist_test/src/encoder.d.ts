/**
 * https://github.com/cloudwu/sproto
 */
import { Type } from "./meta";
import { ITypeProvider } from "./coder";
export declare class Encoder<T = any> {
    private static readonly PRE_ALLOC_SIZE;
    private header;
    private data;
    private headerOffset;
    private dataOffset;
    private fieldCount;
    private type;
    private obj;
    private provider;
    private isLastSkip;
    private tag;
    private stag;
    constructor(type: Type, obj: T, provider: ITypeProvider);
    private checkSkip;
    encode(): Uint8Array | Error;
    private copy;
    private checkHeaderBuf;
    private checkDataBuf;
    private pushInterger;
    private pushDouble;
    private pushString;
    private pushObject;
    private pushBooleans;
    private integer32To64;
    private pushIntegers;
    private pushDoubles;
    private pushStrings;
    private pushObjects;
    private pushHeader;
    private encodeInteger64;
    private encodeInteger;
    private encodeInteger16;
    private setIntergerInData;
    private setIntergerInField;
}
