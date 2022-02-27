"use strict";
/**
 * https://github.com/cloudwu/sproto
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Encoder = void 0;
const meta_1 = require("./meta");
const util_1 = require("./util");
class Encoder {
    constructor(type, obj, provider) {
        this.headerOffset = meta_1.eSize.Header;
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
    checkSkip(v, tag) {
        // If n is odd, that means the tags is not continuous, and we should add current tag by (n+1)/2 .
        if ((0, meta_1.isNull)(v)) {
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
    encode() {
        let err;
        let value;
        let skip;
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
                return new Error(`${this.type.name}.${item.name} need array type, but get ${typeof (value)}`);
            }
            switch (item.type) {
                case meta_1.eType.Boolean:
                    if (item.isArray) {
                        err = this.pushBooleans(value);
                    }
                    else {
                        err = this.pushInterger(value ? 1 : 0);
                    }
                    break;
                case meta_1.eType.Double:
                    if (item.isArray) {
                        err = this.pushDoubles(value);
                    }
                    else {
                        err = this.pushDouble(value);
                    }
                    break;
                case meta_1.eType.Integer:
                    let pow = 0;
                    if (item.extra) {
                        pow = item.extra;
                    }
                    if (item.isArray) {
                        err = this.pushIntegers(value, pow);
                    }
                    else {
                        err = this.pushInterger(value, pow);
                    }
                    break;
                case meta_1.eType.String:
                    if (item.isArray) {
                        err = this.pushStrings(value);
                    }
                    else {
                        err = this.pushString(value);
                    }
                    break;
                case meta_1.eType.Struct:
                    if (item.isArray) {
                        err = this.pushObjects(value, item.structName);
                    }
                    else {
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
    copy(target, targetOffset, src, srcOffset, len) {
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
    checkHeaderBuf(n) {
        if (this.headerOffset + n > meta_1.eSize.MaxFieldCount) {
            return new Error(`Field count exceed limit ${meta_1.eSize.MaxFieldCount}`);
        }
        if (this.headerOffset + n < this.header.byteLength) {
            return undefined;
        }
        let old = this.header;
        this.header = new Uint8Array(old.byteLength * 2);
        this.copy(this.header, 0, old, 0);
    }
    checkDataBuf(n) {
        if (this.dataOffset + n < this.data.byteLength) {
            return;
        }
        let old = this.data;
        this.data = new Uint8Array(old.byteLength * 2);
        this.copy(this.data, 0, old, 0);
    }
    pushInterger(n, pow = 0) {
        let t = typeof (n);
        if (t !== "number") {
            return new Error(`need number type, but get ${t}`);
        }
        if (pow > 0) {
            n = Math.floor(n * Math.pow(10, pow));
        }
        else {
            n = Math.floor(n);
        }
        if (n < 0 || n >= 0x7FFF) {
            return this.setIntergerInData(n);
        }
        return this.setIntergerInField(n);
    }
    pushDouble(v) {
        let t = typeof (v);
        if (t !== "number") {
            return new Error(`need number type, but get ${t}`);
        }
        let err = this.pushHeader(0);
        if (err instanceof Error) {
            return err;
        }
        this.checkDataBuf(meta_1.eSize.Double + 1);
        this.encodeInteger(this.data, this.dataOffset, meta_1.eSize.Double);
        this.dataOffset += meta_1.eSize.DataLength;
        let view = new DataView(this.data.buffer);
        view.setFloat64(this.dataOffset, v, true);
        this.dataOffset += meta_1.eSize.Double;
    }
    pushString(str) {
        let err = this.pushHeader(0);
        if (err instanceof Error) {
            return err;
        }
        let strBuf = (0, util_1.utf8ToBytes)(str);
        let size = strBuf.length + meta_1.eSize.DataLength;
        this.checkDataBuf(size);
        this.encodeInteger(this.data, this.dataOffset, strBuf.length);
        this.dataOffset += meta_1.eSize.DataLength;
        for (let i = 0; i < strBuf.length; i++) {
            this.data[i + this.dataOffset] = strBuf[i] & 0xFF;
        }
        this.dataOffset += strBuf.length;
    }
    pushObject(obj, name) {
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
        let needSize = meta_1.eSize.DataLength + data.byteLength;
        this.checkDataBuf(needSize);
        this.encodeInteger(this.data, this.dataOffset, data.byteLength);
        this.dataOffset++;
        for (let i = 0; i < data.byteLength; i++) {
            this.data[this.dataOffset] = data[i];
            this.dataOffset++;
        }
        return undefined;
    }
    pushBooleans(values) {
        let err = this.pushHeader(0);
        if (err instanceof Error) {
            return err;
        }
        let needSizee = meta_1.eSize.DataLength + values.length;
        this.checkDataBuf(needSizee);
        this.encodeInteger(this.data, this.dataOffset, values.length);
        this.dataOffset += meta_1.eSize.DataLength;
        for (let v of values) {
            this.data[this.dataOffset] = v ? 1 : 0;
            this.dataOffset++;
        }
        return undefined;
    }
    integer32To64(isNegative, buffer, offset) {
        if (isNegative) {
            buffer[offset + 0] = 0xff;
            buffer[offset + 1] = 0xff;
            buffer[offset + 2] = 0xff;
            buffer[offset + 3] = 0xff;
        }
        else {
            buffer[offset + 0] = 0;
            buffer[offset + 1] = 0;
            buffer[offset + 2] = 0;
            buffer[offset + 3] = 0;
        }
    }
    pushIntegers(values, pow) {
        let err = this.pushHeader(0);
        if (err instanceof Error) {
            return err;
        }
        let needSize = meta_1.eSize.DataLength + 1 + values.length * meta_1.eSize.Double;
        let offset = this.dataOffset + meta_1.eSize.DataLength;
        offset++;
        let intSize = 4;
        let dataOffset = offset;
        this.checkDataBuf(needSize);
        let isFixed = false;
        if (pow > 0) {
            pow = Math.pow(10, pow);
            isFixed = true;
        }
        let size;
        let v;
        for (let i = 0; i < values.length; i++) {
            v = values[i];
            if (isFixed) {
                v = Math.floor(v * pow);
            }
            size = (0, util_1.getIntegerBytes)(v);
            if (size == 4) {
                this.encodeInteger(this.data, offset, v);
                if (intSize == 8) {
                    this.integer32To64(v & 0x80000000, this.data, offset + 4);
                }
            }
            else {
                if (intSize == 4) {
                    let newIndex;
                    for (let j = offset - 4; j >= dataOffset; j -= 4) {
                        newIndex = dataOffset + (j - dataOffset) * 2;
                        this.data[newIndex] = this.data[j];
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
        this.dataOffset += meta_1.eSize.DataLength;
        this.data[this.dataOffset] = intSize;
        this.dataOffset++;
        this.dataOffset = offset;
        return undefined;
    }
    pushDoubles(values) {
        let err = this.pushHeader(0);
        if (err instanceof Error) {
            return err;
        }
        let needSizee = meta_1.eSize.DataLength + 1 + values.length * meta_1.eSize.Double;
        this.checkDataBuf(needSizee);
        this.encodeInteger(this.data, this.dataOffset, needSizee - meta_1.eSize.DataLength);
        this.dataOffset += meta_1.eSize.DataLength;
        this.data[this.dataOffset] = 8;
        this.dataOffset++;
        let view = new DataView(this.data.buffer);
        for (let v of values) {
            view.setFloat64(this.dataOffset, v, true);
            this.dataOffset += meta_1.eSize.Double;
        }
        return undefined;
    }
    pushStrings(strs) {
        let err = this.pushHeader(0);
        if (err instanceof Error) {
            return err;
        }
        let totalSize = 0;
        let needSize = meta_1.eSize.DataLength;
        this.checkDataBuf(needSize);
        let offset = this.dataOffset;
        offset += meta_1.eSize.DataLength;
        for (let str of strs) {
            let rs = (0, util_1.utf8ToBytes)(str);
            this.checkDataBuf(meta_1.eSize.DataLength + rs.length);
            totalSize += meta_1.eSize.DataLength + rs.length;
            this.encodeInteger(this.data, offset, rs.length);
            offset += meta_1.eSize.DataLength;
            for (let i = 0; i < rs.length; i++) {
                this.data[offset] = rs[i] & 0xFF;
                offset++;
            }
        }
        this.encodeInteger(this.data, this.dataOffset, totalSize);
        this.dataOffset = offset;
        return undefined;
    }
    pushObjects(objs, name) {
        let type = this.provider.getTypeByName(name);
        if (!type) {
            return new Error(`could not find defined type ${name}`);
        }
        let err = this.pushHeader(0);
        if (err instanceof Error) {
            return err;
        }
        let needSize = meta_1.eSize.DataLength;
        this.checkDataBuf(needSize);
        let totalSize = 0;
        let offset = this.dataOffset + meta_1.eSize.DataLength;
        for (let obj of objs) {
            let enc = new Encoder(type, obj, this.provider);
            let data = enc.encode();
            if (data instanceof Error) {
                return data;
            }
            totalSize += meta_1.eSize.DataLength + data.byteLength;
            this.checkDataBuf(meta_1.eSize.DataLength + data.byteLength);
            this.encodeInteger(this.data, offset, data.byteLength);
            offset += meta_1.eSize.DataLength;
            this.copy(this.data, offset, data, 0);
            offset += data.byteLength;
        }
        this.encodeInteger(this.data, this.dataOffset, totalSize);
        this.dataOffset = offset;
        return undefined;
    }
    pushHeader(v) {
        let err = this.checkHeaderBuf(meta_1.eSize.Field);
        if (err instanceof Error) {
            return err;
        }
        this.encodeInteger16(this.header, this.headerOffset, v);
        this.headerOffset += meta_1.eSize.Field;
    }
    encodeInteger64(data, offset, value) {
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
        let value2 = (0, util_1.integer64RightShift)(value, 32);
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
    encodeInteger(data, offset, value) {
        data[offset + 0] = value & 0xff;
        data[offset + 1] = (value >> 8) & 0xff;
        data[offset + 2] = (value >> 16) & 0xff;
        data[offset + 3] = (value >> 24) & 0xff;
    }
    encodeInteger16(data, offset, value) {
        data[offset + 0] = value & 0xff;
        data[offset + 1] = (value >> 8) & 0xff;
    }
    setIntergerInData(v) {
        //If n is zero, that means the field data is encoded in data part ;
        let err = this.pushHeader(0);
        if (err instanceof Error) {
            return err;
        }
        let size = (0, util_1.getIntegerBytes)(v);
        this.checkDataBuf(size + meta_1.eSize.DataLength);
        this.encodeInteger(this.data, this.dataOffset, size);
        this.dataOffset += meta_1.eSize.DataLength;
        if (size == 8) {
            this.encodeInteger64(this.data, this.dataOffset, v);
        }
        else {
            this.encodeInteger(this.data, this.dataOffset, v);
        }
        this.dataOffset += size;
        return undefined;
    }
    setIntergerInField(v) {
        // If n is even (and not zero), the value of this field is n/2-1 , and the tag increases 1;
        v = (v + 1) * 2;
        return this.pushHeader(v);
    }
}
exports.Encoder = Encoder;
Encoder.PRE_ALLOC_SIZE = 1024;
