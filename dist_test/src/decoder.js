"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Decoder = void 0;
const meta_1 = require("./meta");
const util_1 = require("./util");
class Decoder {
    constructor(type, data, provider) {
        this.provider = provider;
        this.type = type;
        if (data instanceof Uint8Array) {
            this.view = new DataView(data.buffer);
        }
        else {
            this.view = new DataView(data);
        }
    }
    decode() {
        if (this.view.byteLength < meta_1.eSize.Header) {
            return new Error(`data length ${this.view.byteLength} smaller then ${meta_1.eSize.Header}`);
        }
        this.headerOffset = 0;
        let fieldCount = this.view.getUint16(this.headerOffset, true);
        this.headerOffset += meta_1.eSize.Header;
        let dataOffset = meta_1.eSize.Header + fieldCount * meta_1.eSize.Field;
        if (this.view.byteLength < dataOffset) {
            return new Error(`data length ${this.view.byteLength} smaller then ${dataOffset}`);
        }
        this.dataOffset = dataOffset;
        this.tag = -1;
        let tagInfo = {
            tag: 0,
            isSkip: false,
        };
        let err;
        let tag = 0;
        let fieldValue = 0;
        let result = {};
        let extra;
        for (let i = 0; i < fieldCount; i++) {
            fieldValue = this.view.getUint16(this.headerOffset, true);
            this.headerOffset += meta_1.eSize.Field;
            this.checkTag(fieldValue, tagInfo);
            if (tagInfo.isSkip) {
                this.tag = tagInfo.tag;
                continue;
            }
            let field = this.type.findFieldByTag(tagInfo.tag);
            if (!field) {
                return new Error(`could not find tag ${tag} in ${this.type.name}`);
            }
            err = this.preCheck(field, fieldValue, tagInfo.tag);
            if (err instanceof Error) {
                return err;
            }
            switch (field.type) {
                case meta_1.eType.Boolean:
                    if (field.isArray) {
                        err = this.popBooleans(result, field.name);
                    }
                    else {
                        this.popBoolean(result, field.name, fieldValue);
                    }
                    if (err) {
                        return err;
                    }
                    break;
                case meta_1.eType.Double:
                    if (field.isArray) {
                        err = this.popDoubles(result, field.name);
                    }
                    else {
                        err = this.popDouble(result, field.name);
                    }
                    if (err) {
                        return err;
                    }
                    break;
                case meta_1.eType.Integer:
                    extra = 0;
                    if (typeof (field.extra) === "number") {
                        extra = field.extra;
                    }
                    if (field.isArray) {
                        err = this.popIntegers(result, field.name, extra);
                    }
                    else {
                        err = this.popInteger(result, field.name, fieldValue, extra);
                    }
                    if (err) {
                        return err;
                    }
                    break;
                case meta_1.eType.String:
                    if (field.isArray) {
                        err = this.popStrings(result, field.name);
                    }
                    else {
                        err = this.popString(result, field.name);
                    }
                    if (err) {
                        return err;
                    }
                    break;
                case meta_1.eType.Struct:
                    if (field.isArray) {
                        err = this.popStructs(result, field.name, field.structName);
                    }
                    else {
                        err = this.popStruct(result, field.name, field.structName);
                    }
                    if (err) {
                        return err;
                    }
                    break;
                default:
                    return new Error(`unsupport type ${field.type}`);
            }
            this.tag = tagInfo.tag;
        }
        return result;
    }
    checkTag(fieldValue, info) {
        if (fieldValue % 2 === 0) {
            info.tag = this.tag + 1;
            info.isSkip = false;
        }
        else {
            info.tag = this.tag + (fieldValue + 1) / 2;
            info.isSkip = true;
        }
    }
    preCheck(field, fieldValue, tag) {
        if (field.isArray || field.type === meta_1.eType.Double || field.type === meta_1.eType.String || field.type == meta_1.eType.Struct) {
            if (fieldValue !== 0) {
                return new Error(`field ${tag} expected 0, but get ${fieldValue}`);
            }
            return undefined;
        }
        if (field.type === meta_1.eType.Boolean) {
            if (fieldValue === 0) {
                return new Error(`field expected non 0, but get ${fieldValue}`);
            }
            return undefined;
        }
        return undefined;
    }
    popBoolean(obj, name, fieldValue) {
        obj[name] = (fieldValue / 2) - 1 ? true : false;
        return undefined;
    }
    popInteger(obj, name, fieldValue, pow) {
        if (fieldValue == 0) {
            let size = this.dataOffset + meta_1.eSize.DataLength;
            if (this.view.byteLength < size) {
                return new Error(`buffer length ${this.view.byteLength} smaller then ${size}`);
            }
            let intSize = this.view.getUint32(this.dataOffset, true);
            if (intSize !== 4 && intSize !== 8) {
                return new Error(`invalid integer size${intSize}, should be 4 or 8`);
            }
            this.dataOffset += meta_1.eSize.DataLength;
            size += intSize;
            if (this.view.byteLength < size) {
                return new Error(`buffer length ${this.view.byteLength} smaller then ${size}`);
            }
            if (intSize === 4) {
                obj[name] = this.decInteger(this.dataOffset);
            }
            else {
                obj[name] = this.decInteger64(this.dataOffset);
            }
            this.dataOffset += intSize;
        }
        else {
            obj[name] = fieldValue / 2 - 1;
        }
        if (pow > 0) {
            obj[name] = obj[name] / Math.pow(10, pow);
        }
        return undefined;
    }
    decInteger(offset, isUint = false) {
        let n0 = this.view.getUint8(offset);
        let n1 = this.view.getUint8(offset + 1);
        let n2 = this.view.getUint8(offset + 2);
        let n3 = this.view.getUint8(offset + 3);
        let rs = (n0 & 0xff);
        rs |= ((n1 & 0xff) << 8);
        rs |= ((n2 & 0xff) << 16);
        rs |= ((n3 & 0xff) << 24);
        if (isUint) {
            rs = rs >>> 0;
        }
        return rs;
    }
    decInteger64(offset) {
        let low = this.decInteger(offset, true);
        let high = this.decInteger(offset + 4, true);
        return (high & 0xFFFFFFFF) * 0x100000000 + low;
    }
    popDouble(obj, name) {
        let size = this.dataOffset + meta_1.eSize.DataLength;
        if (this.view.byteLength < size) {
            return new Error(`buffer length ${this.view.byteLength} smaller then ${size}`);
        }
        let dSize = this.view.getUint32(this.dataOffset, true);
        if (dSize !== 4 && dSize !== 8) {
            return new Error(`invalid double size${dSize}, should be 4 or 8`);
        }
        this.dataOffset += meta_1.eSize.DataLength;
        size += dSize;
        if (this.view.byteLength < size) {
            return new Error(`buffer length ${this.view.byteLength} smaller then ${size}`);
        }
        if (dSize == 4) {
            obj[name] = this.view.getFloat32(this.dataOffset, true);
        }
        else {
            obj[name] = this.view.getFloat64(this.dataOffset, true);
        }
        this.dataOffset += dSize;
        return undefined;
    }
    popString(obj, name) {
        let size = this.dataOffset + meta_1.eSize.DataLength;
        if (this.view.byteLength < size) {
            return new Error(`buffer length ${this.view.byteLength} smaller then ${size}`);
        }
        let sSize = this.view.getUint32(this.dataOffset, true);
        size += sSize;
        if (this.view.byteLength < size) {
            return new Error(`buffer length ${this.view.byteLength} smaller then ${size}`);
        }
        this.dataOffset += meta_1.eSize.DataLength;
        obj[name] = (0, util_1.utf8Slice)(this.view.buffer, this.dataOffset, this.dataOffset + sSize);
        this.dataOffset += sSize;
        return undefined;
    }
    popStruct(obj, name, structName) {
        let size = this.dataOffset + meta_1.eSize.DataLength;
        if (this.view.byteLength < size) {
            return new Error(`buffer length ${this.view.byteLength} smaller then ${size}`);
        }
        let sSize = this.view.getUint32(this.dataOffset, true);
        size += sSize;
        if (this.view.byteLength < size) {
            return new Error(`buffer length ${this.view.byteLength} smaller then ${size}`);
        }
        this.dataOffset += meta_1.eSize.DataLength;
        let sType = this.provider.getTypeByName(structName);
        if (!sType) {
            return new Error(`could not find type ${structName}`);
        }
        let dec = new Decoder(sType, this.view.buffer.slice(this.dataOffset, this.dataOffset + sSize), this.provider);
        let rs = dec.decode();
        if (rs instanceof Error) {
            return rs;
        }
        obj[name] = rs;
        this.dataOffset += sSize;
        return undefined;
    }
    popBooleans(obj, name) {
        let size = this.dataOffset + meta_1.eSize.DataLength;
        if (this.view.byteLength < size) {
            return new Error(`buffer length ${this.view.byteLength} smaller then ${size}`);
        }
        let dataSize = this.view.getUint32(this.dataOffset, true);
        size += dataSize;
        if (this.view.byteLength < size) {
            return new Error(`buffer length ${this.view.byteLength} smaller then ${size}`);
        }
        this.dataOffset += meta_1.eSize.DataLength;
        obj[name] = [];
        let value;
        for (let i = 0; i < dataSize; i++) {
            value = this.view.getUint8(this.dataOffset + i);
            obj[name].push(value ? true : false);
        }
        this.dataOffset += dataSize;
        return undefined;
    }
    popIntegers(obj, name, pow) {
        let size = this.dataOffset + meta_1.eSize.DataLength;
        if (this.view.byteLength < size) {
            return new Error(`buffer length ${this.view.byteLength} smaller then ${size}`);
        }
        let dataSize = this.view.getUint32(this.dataOffset, true);
        this.dataOffset += meta_1.eSize.DataLength;
        size += dataSize;
        if (this.view.byteLength < size) {
            return new Error(`buffer length ${this.view.byteLength} smaller then ${size}`);
        }
        let intSize = this.view.getUint8(this.dataOffset);
        this.dataOffset++;
        if (intSize !== 4 && intSize !== 8) {
            return new Error(`invalid integer size${intSize}, should be 4 or 8`);
        }
        let is64 = intSize === 8;
        let curSize = 1;
        obj[name] = [];
        while (curSize < dataSize) {
            if (is64) {
                obj[name].push(this.decInteger64(this.dataOffset));
            }
            else {
                obj[name].push(this.decInteger(this.dataOffset));
            }
            this.dataOffset += intSize;
            curSize += intSize;
        }
        return undefined;
    }
    popDoubles(obj, name) {
        let size = this.dataOffset + meta_1.eSize.DataLength;
        if (this.view.byteLength < size) {
            return new Error(`buffer length ${this.view.byteLength} smaller then ${size}`);
        }
        let dataSize = this.view.getUint32(this.dataOffset, true);
        size += dataSize;
        if (this.view.byteLength < size) {
            return new Error(`buffer length ${this.view.byteLength} smaller then ${size}`);
        }
        this.dataOffset += meta_1.eSize.DataLength;
        let dlen = this.view.getUint8(this.dataOffset);
        if (dlen !== 4 && dlen !== 8) {
            return new Error(`invalid double size${dlen}, should be 4 or 8`);
        }
        this.dataOffset++;
        obj[name] = [];
        let is64 = dlen === 8;
        for (let i = 0; i < dataSize - 1; i += dlen) {
            if (is64) {
                obj[name].push(this.view.getFloat64(this.dataOffset + i, true));
            }
            else {
                obj[name].push(this.view.getFloat32(this.dataOffset + i, true));
            }
        }
        this.dataOffset += dataSize - 1;
        return undefined;
    }
    popStrings(obj, name) {
        let size = this.dataOffset + meta_1.eSize.DataLength;
        if (this.view.byteLength < size) {
            return new Error(`buffer length ${this.view.byteLength} smaller then ${size}`);
        }
        let dataSize = this.view.getUint32(this.dataOffset, true);
        size += dataSize;
        if (this.view.byteLength < size) {
            return new Error(`buffer length ${this.view.byteLength} smaller then ${size}`);
        }
        this.dataOffset += meta_1.eSize.DataLength;
        obj[name] = [];
        let slen;
        let curSize = 0;
        while (curSize < dataSize) {
            slen = this.view.getUint32(this.dataOffset, true);
            this.dataOffset += meta_1.eSize.DataLength;
            if (this.view.byteLength < this.dataOffset + slen) {
                return new Error(`buffer length ${this.view.byteLength} smaller then ${this.dataOffset + slen}`);
            }
            obj[name].push((0, util_1.utf8Slice)(this.view.buffer, this.dataOffset, this.dataOffset + slen));
            this.dataOffset += slen;
            curSize += meta_1.eSize.DataLength + slen;
        }
        return undefined;
    }
    popStructs(obj, name, structName) {
        let size = this.dataOffset + meta_1.eSize.DataLength;
        if (this.view.byteLength < size) {
            return new Error(`buffer length ${this.view.byteLength} smaller then ${size}`);
        }
        let dataSize = this.view.getUint32(this.dataOffset, true);
        size += dataSize;
        if (this.view.byteLength < size) {
            return new Error(`buffer length ${this.view.byteLength} smaller then ${size}`);
        }
        this.dataOffset += meta_1.eSize.DataLength;
        obj[name] = [];
        let curSize = 0;
        let sSize;
        while (curSize < dataSize) {
            sSize = this.view.getUint32(this.dataOffset, true);
            this.dataOffset += meta_1.eSize.DataLength;
            if (this.view.byteLength < this.dataOffset + sSize) {
                return new Error(`buffer length ${this.view.byteLength} smaller then ${this.dataOffset + sSize}`);
            }
            let sType = this.provider.getTypeByName(structName);
            if (!sType) {
                return new Error(`could not find type ${structName}`);
            }
            let dec = new Decoder(sType, this.view.buffer.slice(this.dataOffset, this.dataOffset + sSize), this.provider);
            let rs = dec.decode();
            if (rs instanceof Error) {
                return rs;
            }
            obj[name].push(rs);
            this.dataOffset += sSize;
            curSize += meta_1.eSize.DataLength + sSize;
        }
        return undefined;
    }
}
exports.Decoder = Decoder;
