"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareFloats = exports.compareFloat = exports.arrayCompare = exports.dumpArray = void 0;
function dumpArray(arr) {
    let str = "";
    for (let i = 0; i < arr.length; i++) {
        if (i != 0 && i % 16 == 0) {
            console.log(str);
            str = "";
        }
        let c = arr[i].toString(16);
        if (c.length == 1) {
            c = "0" + c;
        }
        str += c + " ";
    }
    console.log(str);
}
exports.dumpArray = dumpArray;
function arrayCompare(a, b) {
    if (!a || !b) {
        console.log("a or b is not array");
        return false;
    }
    if (a.length != b.length) {
        console.log(`a.length != b.length,a.length=${a.length},b.lenth=${b.length}`);
        console.log("a");
        dumpArray(a);
        console.log("b");
        dumpArray(b);
        return false;
    }
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            console.log(`index=${i}, a=${a[i]},b=${b[i]}`);
            console.log("a");
            dumpArray(a);
            console.log("b");
            dumpArray(b);
            return false;
        }
    }
    return true;
}
exports.arrayCompare = arrayCompare;
function compareFloat(a, b, precision = 0) {
    let aStr = a.toFixed(precision);
    let bStr = b.toFixed(precision);
    if (aStr !== bStr) {
        console.log(`a=${aStr},b=${bStr}`);
        return false;
    }
    return true;
}
exports.compareFloat = compareFloat;
function compareFloats(as, bs, precision = 0) {
    if (!as || !bs) {
        console.log("a or b is not array");
        return false;
    }
    if (as.length != bs.length) {
        console.log(`a.length != b.length,a.length=${as.length},b.lenth=${bs.length}`);
        return false;
    }
    for (let i = 0; i < as.length; i++) {
        if (!compareFloat(as[i], bs[i], precision)) {
            return false;
        }
    }
    return true;
}
exports.compareFloats = compareFloats;
