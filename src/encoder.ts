/**
 * https://github.com/cloudwu/sproto
 */

import {
    Type, eSize, isNull, eType
} from "./meta";

import {
    utf8ToBytes,
    integer64RightShift,
    getIntegerBytes,
} from "./util";

import {ITypeProvider} from "./coder";


export class Encoder<T = any> {
    private static readonly PRE_ALLOC_SIZE = 1024;
    private header: Uint8Array;
    private data: Uint8Array;
    private headerOffset: number;
    private dataOffset: number;
    private fieldCount: number;
    private type: Type;
    private obj: T;
    private provider: ITypeProvider;
    private isLastSkip: boolean;
    private tag: number;
    private stag: number;

    constructor(type: Type, obj: T, provider: ITypeProvider){
        this.headerOffset = eSize.Header;
        this.dataOffset = 0;
        this.fieldCount = 0;
        this.tag = -1;
        this.type = type;
        this.obj = obj;
        this.provider = provider;
        this.isLastSkip = false;
        this.stag = 0;
        this.header = new Uint8Array(Encoder.PRE_ALLOC_SIZE);
        this.data = new Uint8Array(Encoder.PRE_ALLOC_SIZE);
    }

    private checkSkip(v: any, tag: number): boolean | Error {
        // If n is odd, that means the tags is not continuous, and we should add current tag by (n+1)/2 .
        if (isNull(v)) {
            this.isLastSkip = true;
            this.stag = tag;
            return true;
        }
        if (this.isLastSkip) {
            let odd = (this.stag - this.tag) * 2 - 1;
            let err = this.pushHeader(odd);
            if (err instanceof Error) {
                return err;
            }
            this.fieldCount++;
        } 

        this.tag = tag;
        this.isLastSkip = false;
        return false;
    }

    public encode(): Uint8Array | Error {
        let err: Error;
        let value: any;
        let skip: Error | boolean;
        for (let item of this.type.fileds) {
            value = this.obj[item.name];
            skip = this.checkSkip(value, item.tag);
            if (skip instanceof Error) {
                return skip;
            }
            if (skip) {
                continue;
            }
            if (item.isArray && !Array.isArray(value)) {
                return new Error(`${this.type.name}.${item.name} need array type, but get ${typeof(value)}`);
            }
            switch (item.type) {
                case eType.Boolean:
                    if (item.isArray) {
                        err = this.pushBooleans(value);
                    } else {
                        err = this.pushInterger(value ? 1 : 0);
                    }
                    break;
                case eType.Double:
                    if (item.isArray) {
                        err = this.pushDoubles(value);
                    } else {
                        err = this.pushDouble(value);
                    }
                    break;
                case eType.Integer:
                    let pow = 0;
                    if (item.extra) {
                        pow =  item.extra as number;
                    }
                    if (item.isArray) {
                        err = this.pushIntegers(value, pow);
                    } else {
                        err = this.pushInterger(value, pow);
                    }
                    break;
                case eType.String:
                    if (item.isArray) {
                        err = this.pushStrings(value);
                    } else {
                        err = this.pushString(value);
                    }
                    break;
                case eType.Struct:
                    if (item.isArray) {
                        err = this.pushObjects(value, item.structName);
                    } else {
                        err = this.pushObject(value, item.structName);
                    }
                    break;
                default:
                    return new Error(`unsupport  type for ${this.type.name}.${item.name}:${item.type}`);
            }
            if (err) {
                return err;
            }
            this.fieldCount++;
        }

        this.encodeInteger16(this.header, 0, this.fieldCount);
        let buf = new Uint8Array(this.headerOffset + this.dataOffset);
        
        let offset = 0;
        for (let i = 0; i < this.headerOffset; i++) {
            buf[offset] = this.header[i];
            offset++;
        }
        for (let i = 0; i < this.dataOffset; i++) {
            buf[offset] = this.data[i];
            offset++;
        }
        return buf;
    }

    //???
    private copy(target: Uint8Array, targetOffset: number, src: Uint8Array, srcOffset: number, len ?: number): void {
        // let len = src.byteLength;
        // if (len < 8) {
        //     for (let i = 0; i < src.byteLength; i++) {
        //         target[i] = src[i];
        //     }
        //     return;
        // }

        // let r = src.byteLength % 8;
        // let n = src.byteLength - r;
        // let targetView = new DataView(target.buffer, 0, n);
        // let srcView = new DataView(src.buffer, 0, n);
        // for (let i = 0; i < n; i += 8) {
        //     targetView.setFloat64(i, srcView.getFloat64(i));
        // }
        // for (let i = n; i < src.byteLength; i++) {
        //     target[i] = src[i];
        // }
        if (!len) {
            len = src.byteLength - srcOffset;
        }

        for (let i = 0; i < len; i++) {
            target[i + targetOffset] = src[i + srcOffset];
        }
    }


    private checkHeaderBuf(n: number): Error | undefined {
        if (this.headerOffset + n > eSize.MaxFieldCount) {
            return new Error(`Field count exceed limit ${eSize.MaxFieldCount}`);
        }
        if (this.headerOffset + n < this.header.byteLength) {
            return undefined;
        }
        let old = this.header;
        this.header = new Uint8Array(old.byteLength * 2);
        this.copy(this.header, 0, old, 0);
    }

    private checkDataBuf(n: number): void {
        if (this.dataOffset + n < this.data.byteLength) {
            return;
        }
        let old = this.data;
        this.data = new Uint8Array(old.byteLength * 2);
        this.copy(this.data, 0, old, 0);
    }

    private pushInterger(n: number, pow : number = 0): Error {
        let t = typeof(n);
        if (t !== "number") {
            return new Error(`need number type, but get ${t}`);
        }
        
        if (pow > 0) {
            n = Math.floor(n * Math.pow(10, pow));
        } else {
            n = Math.floor(n);
        }
        if (n < 0 || n >= 0x7FFF) {
            return this.setIntergerInData(n);
        }
        return this.setIntergerInField(n);
    }

    private pushDouble(v: number): Error {
        let t = typeof(v);
        if (t !== "number") {
            return new Error(`need number type, but get ${t}`);
        }

        let err = this.pushHeader(0);
        if (err instanceof Error) {
            return err;
        }

        this.checkDataBuf(eSize.Double + 1);
        this.encodeInteger(this.data, this.dataOffset, eSize.Double);
        this.dataOffset += eSize.DataLength;

        let view = new DataView(this.data.buffer);
        view.setFloat64(this.dataOffset, v, true);
        this.dataOffset += eSize.Double;
    }

    private pushString(str: string): Error {
        let err = this.pushHeader(0);
        if (err instanceof Error) {
            return err;
        }

        
        let strBuf = utf8ToBytes(str);
        let size = strBuf.length + eSize.DataLength;
        this.checkDataBuf(size);
        
        this.encodeInteger(this.data, this.dataOffset, strBuf.length);
        this.dataOffset += eSize.DataLength;

        for (let i = 0; i < strBuf.length; i++) {
            this.data[i + this.dataOffset] = strBuf[i] & 0xFF;
        }
        this.dataOffset += strBuf.length;
    }

    private pushObject<T>(obj: T, name: string): Error {
        let type = this.provider.getTypeByName(name);
        if (!type) {
            return new Error(`could not find defined type ${name}`);
        }

        let err = this.pushHeader(0);
        if (err instanceof Error) {
            return err;
        }
        
        let enc = new Encoder(type, obj, this.provider);
        let data = enc.encode();
        if (data instanceof Error) {
            return data;
        }

        let needSize = eSize.DataLength + data.byteLength;
        this.checkDataBuf(needSize);
        this.encodeInteger(this.data, this.dataOffset, data.byteLength);
        this.dataOffset++;

        for (let i = 0; i < data.byteLength; i++) {
            this.data[this.dataOffset] = data[i];
            this.dataOffset++;
        }

        return undefined;
    }

    private pushBooleans(values: Array<boolean | number>): Error {
        let err = this.pushHeader(0);
        if (err instanceof Error) {
            return err;
        }

        let needSizee = eSize.DataLength + values.length;
        this.checkDataBuf(needSizee);

        this.encodeInteger(this.data, this.dataOffset, values.length);
        this.dataOffset += eSize.DataLength;

        for (let v of values) {
            this.data[this.dataOffset] = v ? 1 : 0;
            this.dataOffset++;
        }

        return undefined;
    }

    private integer32To64(isNegative: boolean | number, buffer: Uint8Array, offset: number): void {
        if (isNegative) {
            buffer[offset + 0] = 0xff;
            buffer[offset + 1] = 0xff;
            buffer[offset + 2] = 0xff;
            buffer[offset + 3] = 0xff;
        } else {
            buffer[offset + 0] = 0;
            buffer[offset + 1] = 0;
            buffer[offset + 2] = 0;
            buffer[offset + 3] = 0;
        }
    }

    private pushIntegers(values: Array<number>, pow: number): Error {
        let err = this.pushHeader(0);
        if (err instanceof Error) {
            return err;
        }

        let needSize = eSize.DataLength + 1 + values.length * eSize.Double;
       
        let offset = this.dataOffset + eSize.DataLength;
        offset++;
        let intSize = 4;
        let dataOffset = offset;

        this.checkDataBuf(needSize);
        let isFixed: boolean = false;
        if (pow > 0) {
            pow = Math.pow(10, pow);
            isFixed = true;
        }

        let size: number;
        let v: number;
        for (let i = 0; i <  values.length; i++) {
            v = values[i];
            if (isFixed) {
                v = Math.floor(v * pow);
            }
            size = getIntegerBytes(v);
            if (size == 4) {
                this.encodeInteger(this.data, offset, v);
                if (intSize == 8) {
                    this.integer32To64(v & 0x80000000, this.data, offset + 4);
                }
            } else {
                if (intSize == 4) {
                    let newIndex: number;
                    for (let j = offset - 4; j >= dataOffset; j -= 4) {
                        newIndex = dataOffset + (j - dataOffset) * 2;

                        this.data[newIndex    ] = this.data[j];
                        this.data[newIndex + 1] = this.data[j + 1];
                        this.data[newIndex + 2] = this.data[j + 2];
                        this.data[newIndex + 3] = this.data[j + 3];
                        
                        this.integer32To64(this.data[j + 3] & 0x80, this.data, newIndex + 4);
                    }
                    intSize = 8;
                    offset = dataOffset + i * 8;
                }
                this.encodeInteger64(this.data, offset, v);
            }
            
            offset += intSize;
        }

        let totalSize = values.length * intSize + 1;
        this.encodeInteger(this.data, this.dataOffset, totalSize);
        this.dataOffset += eSize.DataLength;
        this.data[this.dataOffset] = intSize;
        this.dataOffset++;
        
        this.dataOffset = offset;
        return undefined;
    }

    private pushDoubles(values: Array<number>): Error {
        let err = this.pushHeader(0);
        if (err instanceof Error) {
            return err;
        }

        let needSizee = eSize.DataLength + 1 + values.length * eSize.Double;
        this.checkDataBuf(needSizee);

        this.encodeInteger(this.data, this.dataOffset, needSizee - eSize.DataLength);
        this.dataOffset += eSize.DataLength;

        this.data[this.dataOffset] = 8;
        this.dataOffset++;

        let view = new DataView(this.data.buffer);
        for (let v of values) {
            view.setFloat64(this.dataOffset, v, true);
            this.dataOffset += eSize.Double;
        }
        return undefined;
    }

    private pushStrings(strs: Array<string>): Error {
  
        let err = this.pushHeader(0);
        if (err instanceof Error) {
            return err;
        }
    

        let totalSize: number = 0;
        let needSize = eSize.DataLength;
        this.checkDataBuf(needSize);
        let offset = this.dataOffset;
        offset += eSize.DataLength;

        for (let str of strs) {
            let rs = utf8ToBytes(str);
            this.checkDataBuf(eSize.DataLength + rs.length);
            totalSize += eSize.DataLength + rs.length;
            this.encodeInteger(this.data, offset, rs.length);
            offset += eSize.DataLength;

            for (let i = 0; i < rs.length; i++) {
                this.data[offset] = rs[i] & 0xFF;
                offset++;
            }
        }

        this.encodeInteger(this.data, this.dataOffset, totalSize);
        this.dataOffset = offset;

        return undefined;
    }

    private pushObjects<T>(objs: Array<T>, name: string): Error {
        let type = this.provider.getTypeByName(name);
        if (!type) {
            return new Error(`could not find defined type ${name}`);
        }

        let err = this.pushHeader(0);
        if (err instanceof Error) {
            return err;
        }

        let needSize = eSize.DataLength;
        this.checkDataBuf(needSize);
        let totalSize = 0;
        let offset = this.dataOffset + eSize.DataLength;

        for (let obj of objs) {
            let enc = new Encoder(type, obj, this.provider);
            let data = enc.encode();
            if (data instanceof Error) {
                return data;
            }

            totalSize += eSize.DataLength + data.byteLength;
            this.checkDataBuf(eSize.DataLength + data.byteLength);
            this.encodeInteger(this.data, offset, data.byteLength);
            offset += eSize.DataLength;

            this.copy(this.data, offset, data, 0);
            offset += data.byteLength;
        }

        this.encodeInteger(this.data, this.dataOffset, totalSize);
        this.dataOffset = offset;
        return undefined;
    }

    private pushHeader(v: number): Error {
        let err = this.checkHeaderBuf(eSize.Field);
        if (err instanceof Error) {
            return err;
        }
        this.encodeInteger16(this.header, this.headerOffset, v);
        this.headerOffset += eSize.Field;
    }

    private encodeInteger64(data: Uint8Array, offset: number, value: number): void {
        // data[offset + 0] = value & 0xff;
        // data[offset + 1] = (value >> 8) & 0xff;
        // data[offset + 2] = (value >> 16) & 0xff;
        // data[offset + 3] = (value >> 24) & 0xff;
        // data[offset + 4] = (value >> 32) & 0xff;
        // data[offset + 5] = (value >> 40) & 0xff;
        // data[offset + 6] = (value >> 48) & 0xff;
        // data[offset + 7] = (value >> 56) & 0xff;

        data[offset + 0] = value & 0xff;
        data[offset + 1] = (value >> 8) & 0xff;
        data[offset + 2] = (value >> 16) & 0xff;
        data[offset + 3] = (value >> 24) & 0xff;
        let value2 = integer64RightShift(value, 32);
        data[offset + 4] = value2 & 0xff;
        data[offset + 5] = (value2 >> 8) & 0xff;
        data[offset + 6] = (value2 >> 16) & 0xff;
        data[offset + 7] = (value2 >> 24) & 0xff;

        // data[offset + 0] = value & 0xff;
        // data[offset + 1] = integer64RightShift(value, 8)  & 0xff;
        // data[offset + 2] = integer64RightShift(value, 16) & 0xff;
        // data[offset + 3] = integer64RightShift(value, 24) & 0xff;
        // data[offset + 4] = integer64RightShift(value, 32) & 0xff;
        // data[offset + 5] = integer64RightShift(value, 40) & 0xff;
        // data[offset + 6] = integer64RightShift(value, 48) & 0xff;
        // data[offset + 7] = integer64RightShift(value, 56) & 0xff;
    }

    private encodeInteger(data: Uint8Array, offset: number, value: number): void {
        data[offset + 0] = value & 0xff;
        data[offset + 1] = (value >> 8) & 0xff;
        data[offset + 2] = (value >> 16) & 0xff;
        data[offset + 3] = (value >> 24) & 0xff;
    }

    private encodeInteger16(data: Uint8Array, offset: number, value: number): void {
        data[offset + 0] = value & 0xff;
        data[offset + 1] = (value >> 8) & 0xff;
    }

    private setIntergerInData(v: number): Error {
        //If n is zero, that means the field data is encoded in data part ;
        let err = this.pushHeader(0);
        if (err instanceof Error) {
            return err;
        }

        let size = getIntegerBytes(v);
        this.checkDataBuf(size + eSize.DataLength);

        this.encodeInteger(this.data, this.dataOffset, size);
        this.dataOffset += eSize.DataLength;

        if (size == 8) {
            this.encodeInteger64(this.data, this.dataOffset, v);
        } else {
            this.encodeInteger(this.data, this.dataOffset, v);
        }
        this.dataOffset += size;
        
        return undefined;
    }

    private setIntergerInField(v: number): Error {
        // If n is even (and not zero), the value of this field is n/2-1 , and the tag increases 1;
        v = (v + 1) * 2;
        return this.pushHeader(v);
    }
}