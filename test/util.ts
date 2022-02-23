export function dumpArray(arr: ArrayLike<number>): void {
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

export function arrayCompare(a: ArrayLike<number>, b: ArrayLike<number>): boolean {
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

export function compareFloat(a: number, b: number, precision: number = 0): boolean {
    let aStr = a.toFixed(precision);
    let bStr = b.toFixed(precision);
    if (aStr !== bStr) {
        console.log(`a=${aStr},b=${bStr}`);
        return false;
    }
    return true;
}

export function compareFloats(as: number[], bs: number[], precision: number = 0): boolean {
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