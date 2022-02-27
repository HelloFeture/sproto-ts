"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sproto = void 0;
const decoder_1 = require("./decoder");
const encoder_1 = require("./encoder");
/**
 * sproto
 */
class Sproto {
    constructor() {
        this.types = {};
        this.protocols = {
            storeWithName: {},
            storeWithTag: {},
        };
    }
    addType(t) {
        let tp = this.types[t.name];
        if (tp) {
            return new Error(`${t.name} exists in sproto`);
        }
        this.types[t.name] = t;
    }
    getTypeByName(name) {
        return this.types[name];
    }
    addProtocol(p) {
        let cur = this.protocols.storeWithName[p.name];
        if (cur) {
            return new Error(`protocol ${p.name} exists`);
        }
        cur = this.protocols.storeWithTag[p.tag];
        if (cur) {
            return new Error(`protocol tag ${p.tag} exists`);
        }
        this.protocols.storeWithName[p.name] = p;
        this.protocols.storeWithTag[p.tag] = p;
    }
    getProtocolByName(name) {
        return this.protocols.storeWithName[name];
    }
    getProtocolByTag(tag) {
        return this.protocols.storeWithTag[tag];
    }
    dump() {
        for (let n in this.types) {
            this.types[n].dump();
        }
        for (let n in this.protocols.storeWithName) {
            this.protocols.storeWithName[n].dump();
        }
    }
    host() {
    }
    attach() {
        let self = this;
        let req = function (name, args, session) {
            let p = self.getProtocolByName(name);
            if (!p) {
                return new Error(`could not find protocol ${name}`);
            }
        };
        return req;
    }
    dispatch(buf, index) {
        return undefined;
    }
    encode(typeName, data) {
        let type = this.getTypeByName(typeName);
        if (!type) {
            return new Error(`could not find type ${typeName}`);
        }
        let encoder = new encoder_1.Encoder(type, data, this);
        return encoder.encode();
    }
    pencode(typeName, data) {
        let msg = this.encode(typeName, data);
        if (msg instanceof Error) {
            return msg;
        }
        return this.pack(msg);
    }
    decode(typeName, data) {
        let type = this.getTypeByName(typeName);
        if (!type) {
            return new Error(`could not find type ${typeName}`);
        }
        let decoder = new decoder_1.Decoder(type, data, this);
        return decoder.decode();
    }
    pdecode(typeName, buf) {
        let decBuf = this.unpack(buf);
        if (decBuf instanceof Error) {
            return decBuf;
        }
        return this.decode(typeName, buf);
    }
    pack(buf) {
        let srcSize = buf.length;
        let destSize = (srcSize + 2047) / 2048 * 2 + srcSize + 2;
        let destBuf = new Uint8Array(destSize);
        let tmpBuf = new Uint8Array(8);
        let destIndex = 0;
        let srcIndex = 0;
        let ffN = 0;
        let srcStart = -1;
        let destStart = -1;
        let ffBuf;
        for (let i = 0; i < srcSize; i += 8) {
            srcIndex = i;
            let n = 0;
            let padding = i + 8 - srcSize;
            if (padding > 0) {
                let data_end = 8 - padding;
                for (let j = 0; j < 8; ++j) {
                    if (j < data_end) {
                        tmpBuf[j] = buf[i + j];
                        continue;
                    }
                    tmpBuf[j] = 0;
                }
                buf = tmpBuf;
                srcIndex = 0;
            }
            n = this.packSeg(buf, srcIndex, destBuf, destIndex, ffN);
            destSize -= n;
            if (n === 10) {
                srcStart = srcIndex;
                destStart = destIndex;
                ffBuf = buf;
                ffN = 1;
            }
            else if (n === 8 && ffN > 0) {
                ffN++;
                if (ffN === 256) {
                    if (destSize >= 0) {
                        this.writeFF(ffBuf, srcStart, destBuf, destStart, 256 * 8);
                    }
                    ffN = 0;
                }
            }
            else {
                if (ffN > 0) {
                    if (destSize >= 0) {
                        this.writeFF(ffBuf, srcStart, destBuf, destStart, ffN * 8);
                    }
                    ffN = 0;
                }
            }
            destIndex += n;
        }
        if (destSize >= 0) {
            if (ffN === 1) {
                this.writeFF(ffBuf, srcStart, destBuf, destStart, 8);
            }
            else if (ffN > 1) {
                this.writeFF(ffBuf, srcStart, destBuf, destStart, srcSize - srcStart);
            }
        }
        return destBuf.slice(0, destIndex);
    }
    packSeg(srcBuf, srcIndex, destBuf, destIndex, n) {
        let header = destIndex++;
        let notZero = 0;
        let bits = 0;
        for (var i = 0; i < 8; ++i) {
            if (srcBuf[srcIndex + i] !== 0) {
                destBuf[destIndex++] = srcBuf[srcIndex + i];
                bits |= (1 << i);
                notZero++;
            }
        }
        if ((notZero === 6 || notZero === 7) && n > 0) {
            notZero = 8;
        }
        if (notZero === 8) {
            if (n > 0) {
                return 8;
            }
            return 10;
        }
        destBuf[header] = bits;
        return notZero + 1;
    }
    writeFF(buffer, srcStart, dstbuffer, dstStart, n) {
        // mutiple of 8
        let align8N = (n + 7) & (~7);
        dstbuffer[dstStart] = 0xff;
        dstbuffer[dstStart + 1] = align8N / 8 - 1;
        let start = dstStart + 2;
        for (let i = start; i < start + n; ++i) {
            dstbuffer[i] = buffer[srcStart + i - start];
        }
        start += n;
        for (let i = 0; i < align8N - n; ++i) {
            dstbuffer[start + i] = 0;
        }
    }
    unpack(msg) {
        let buf;
        if (msg instanceof ArrayBuffer) {
            buf = new Uint8Array(msg);
        }
        else {
            buf = msg;
        }
        let srcSize = buf.length;
        let outBuf;
        let size = 0;
        do {
            srcSize *= 2;
            outBuf = Buffer.allocUnsafe(srcSize);
            size = this.lunpack(buf, outBuf);
            if (size < 0) {
                return new Error("[sproto error]: Invalid unpack stream");
            }
        } while (size > srcSize);
        return outBuf.slice(0, size);
    }
    lunpack(buf, outBuf) {
        let srcIndex = 0;
        let outIndex = 0;
        let srcSize = buf.length;
        let outSize = outBuf.length;
        while (srcSize > 0) {
            let bits = buf[srcIndex++];
            srcSize--;
            if (bits === 0xff) {
                let n = (buf[srcIndex++] + 1) * 8;
                srcSize--;
                if (srcSize < n)
                    return -1;
                if (outSize - outIndex > n) {
                    for (let j = 0; j < n; ++j) {
                        outBuf[outIndex++] = buf[srcIndex++];
                    }
                }
                srcSize -= n;
            }
            else {
                for (let i = 0; i < 8; ++i) {
                    if ((bits & 1) === 1) {
                        if (srcSize < 0) {
                            return -1;
                        }
                        if (outIndex < outSize) {
                            outBuf[outIndex] = buf[srcIndex];
                        }
                        srcSize--;
                        outIndex++;
                        srcIndex++;
                    }
                    else {
                        if (outIndex < outSize) {
                            outBuf[outIndex] = 0;
                        }
                        else {
                            return outIndex + 1;
                        }
                        outIndex++;
                    }
                    bits >>>= 1;
                }
            }
        }
        return outIndex;
    }
}
exports.Sproto = Sproto;
