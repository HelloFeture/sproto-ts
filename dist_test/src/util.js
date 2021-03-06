"use strict";
/**
 * copy from nodejs Buffer
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIntegerBytes = exports.integer64LeftShift = exports.integer64RightShift = exports.utf8Slice = exports.utf8ToBytes = void 0;
// copy from nodejs Buffer
function utf8ToBytes(str, units) {
    units = units || Infinity;
    let codePoint;
    let length = str.length;
    let leadSurrogate = null;
    let bytes = [];
    for (var i = 0; i < length; ++i) {
        codePoint = str.charCodeAt(i);
        // is surrogate component
        if (codePoint > 0xD7FF && codePoint < 0xE000) {
            // last char was a lead
            if (!leadSurrogate) {
                // no lead yet
                if (codePoint > 0xDBFF) {
                    // unexpected trail
                    if ((units -= 3) > -1) {
                        bytes.push(0xEF, 0xBF, 0xBD);
                    }
                    continue;
                }
                else if (i + 1 === length) {
                    // unpaired lead
                    if ((units -= 3) > -1) {
                        bytes.push(0xEF, 0xBF, 0xBD);
                    }
                    continue;
                }
                // valid lead
                leadSurrogate = codePoint;
                continue;
            }
            // 2 leads in a row
            if (codePoint < 0xDC00) {
                if ((units -= 3) > -1) {
                    bytes.push(0xEF, 0xBF, 0xBD);
                }
                leadSurrogate = codePoint;
                continue;
            }
            // valid surrogate pair
            codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000;
        }
        else if (leadSurrogate) {
            // valid bmp char, but last char was a lead
            if ((units -= 3) > -1) {
                bytes.push(0xEF, 0xBF, 0xBD);
            }
        }
        leadSurrogate = null;
        // encode utf8
        if (codePoint < 0x80) {
            if ((units -= 1) < 0) {
                break;
            }
            bytes.push(codePoint);
        }
        else if (codePoint < 0x800) {
            if ((units -= 2) < 0) {
                break;
            }
            bytes.push(codePoint >> 0x6 | 0xC0, codePoint & 0x3F | 0x80);
        }
        else if (codePoint < 0x10000) {
            if ((units -= 3) < 0) {
                break;
            }
            bytes.push(codePoint >> 0xC | 0xE0, codePoint >> 0x6 & 0x3F | 0x80, codePoint & 0x3F | 0x80);
        }
        else if (codePoint < 0x110000) {
            if ((units -= 4) < 0) {
                break;
            }
            bytes.push(codePoint >> 0x12 | 0xF0, codePoint >> 0xC & 0x3F | 0x80, codePoint >> 0x6 & 0x3F | 0x80, codePoint & 0x3F | 0x80);
        }
        else {
            throw new Error('Invalid code point');
        }
    }
    return bytes;
}
exports.utf8ToBytes = utf8ToBytes;
// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
const MAX_ARGUMENTS_LENGTH = 0x1000;
function decodeCodePointsArray(codePoints) {
    let len = codePoints.length;
    if (len <= MAX_ARGUMENTS_LENGTH) {
        return String.fromCharCode.apply(String, codePoints); // avoid extra slice()
    }
    // Decode in chunks to avoid "call stack size exceeded".
    let res = '';
    let i = 0;
    while (i < len) {
        res += String.fromCharCode.apply(String, codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH));
    }
    return res;
}
function utf8Slice(buf, start, end) {
    end = Math.min(buf.byteLength, end);
    let res = [];
    let view = new DataView(buf);
    let i = start;
    while (i < end) {
        let firstByte = view.getUint8(i);
        let codePoint = null;
        let bytesPerSequence = (firstByte > 0xEF) ? 4
            : (firstByte > 0xDF) ? 3
                : (firstByte > 0xBF) ? 2
                    : 1;
        if (i + bytesPerSequence <= end) {
            let secondByte, thirdByte, fourthByte, tempCodePoint;
            switch (bytesPerSequence) {
                case 1:
                    if (firstByte < 0x80) {
                        codePoint = firstByte;
                    }
                    break;
                case 2:
                    secondByte = buf[i + 1];
                    if ((secondByte & 0xC0) === 0x80) {
                        tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F);
                        if (tempCodePoint > 0x7F) {
                            codePoint = tempCodePoint;
                        }
                    }
                    break;
                case 3:
                    secondByte = buf[i + 1];
                    thirdByte = buf[i + 2];
                    if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
                        tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F);
                        if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
                            codePoint = tempCodePoint;
                        }
                    }
                    break;
                case 4:
                    secondByte = buf[i + 1];
                    thirdByte = buf[i + 2];
                    fourthByte = buf[i + 3];
                    if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
                        tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F);
                        if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
                            codePoint = tempCodePoint;
                        }
                    }
            }
        }
        if (codePoint === null) {
            // we did not generate a valid codePoint so insert a
            // replacement char (U+FFFD) and advance only 1 byte
            codePoint = 0xFFFD;
            bytesPerSequence = 1;
        }
        else if (codePoint > 0xFFFF) {
            // encode to utf16 (surrogate pair dance)
            codePoint -= 0x10000;
            res.push(codePoint >>> 10 & 0x3FF | 0xD800);
            codePoint = 0xDC00 | codePoint & 0x3FF;
        }
        res.push(codePoint);
        i += bytesPerSequence;
    }
    return decodeCodePointsArray(res);
}
exports.utf8Slice = utf8Slice;
function integer64RightShift(num, offset) {
    return Math.floor(num / Math.pow(2, offset));
}
exports.integer64RightShift = integer64RightShift;
function integer64LeftShift(num, offset) {
    return num * Math.pow(2, offset);
}
exports.integer64LeftShift = integer64LeftShift;
function getIntegerBytes(num) {
    let v = integer64RightShift(num, 31);
    if (v === 0 || v === -1) {
        return 4;
    }
    return 8;
}
exports.getIntegerBytes = getIntegerBytes;
