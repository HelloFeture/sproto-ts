import { Type, Protocol } from "./meta";
export declare type Attach<T> = (name: string, args: T, session?: number) => Uint8Array | Error;
/**
 * sproto
 */
export declare class Sproto {
    private types;
    private protocols;
    constructor();
    addType(t: Type): Error;
    getTypeByName(name: string): Type | undefined;
    addProtocol(p: Protocol): Error;
    getProtocolByName(name: string): Protocol | undefined;
    getProtocolByTag(tag: number): Protocol | undefined;
    dump(): void;
    host(): void;
    attach<T = any>(): (name: string, args: T, session?: number) => Uint8Array | Error;
    dispatch(buf: Uint8Array, index: number): Error;
    encode<T>(typeName: string, data: T): Error | Uint8Array;
    pencode<T>(typeName: string, data: T): Error | Uint8Array;
    decode<T>(typeName: string, data: ArrayBuffer | Uint8Array): Error | T;
    pdecode<T>(typeName: string, buf: Uint8Array | ArrayBuffer): T | Error;
    pack(buf: Uint8Array): Uint8Array;
    private packSeg;
    private writeFF;
    unpack(msg: Uint8Array | ArrayBuffer): Uint8Array | Error;
    private lunpack;
}
