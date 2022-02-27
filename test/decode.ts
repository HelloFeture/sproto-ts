
import * as mocha from "mocha";
import * as assert from "assert";

import { Sproto } from "../src/sproto";
import { TextParser } from "../src/text-parser";
import { integer64LeftShift } from "../src/util";
import { compareFloat, compareFloats } from "./util";

const sp = `
.Person {
    name 0 : string
    age 1 : integer
    marital 2 : boolean
    children 3 : *Person
}

.Data {
	numbers 0 : *integer
	bools 1 : *boolean
	number 2 : integer
	bignumber 3 : integer
 	double 4 : double
 	doubles 5 : *double
 	fpn 6 : integer(2)
}
`;

let sproto: Sproto;

function parse(): void {
    let err = TextParser.parse(sp);
    if (!(err instanceof Error)) {
        sproto = err;
    }
}

function decodePerson1(): void {
    let need = {
        name: "Alice", age: 13, marital: false
    };
    let buf = new Uint8Array([
        0x03, 0x00,
        0x00, 0x00,
        0x1c, 0x00,
        0x02, 0x00,
        0x05, 0x00, 0x00, 0x00,
        0x41, 0x6c, 0x69, 0x63, 0x65,
    ]);
    let rs = sproto.decode("Person", buf);
    if (rs instanceof Error) {
        assert.fail(rs.message);
    } else {
        assert.deepEqual(need, rs);
    }
}

function decodePerson2(): void {
    let need = {
        name: "Bob",
        age: 40,
        children: [
            { name: "Alice", age: 13 },
            { name: "Carol", age: 5 },
        ]
    };
    let buf = new Uint8Array([
        0x04, 0x00,// (fn = 4)
        0x00, 0x00,// (id = 0, value in data part)
        0x52, 0x00,// (id = 1, value = 40)
        0x01, 0x00,// (skip id = 2)
        0x00, 0x00,// (id = 3, value in data part)
        0x03, 0x00, 0x00, 0x00,// (sizeof "Bob")
        0x42, 0x6F, 0x62,// ("Bob")
        0x26, 0x00, 0x00, 0x00,// (sizeof children)
        0x0F, 0x00, 0x00, 0x00,// (sizeof child 1)
        0x02, 0x00,// (fn = 2)
        0x00, 0x00,// (id = 0, value in data part)
        0x1C, 0x00,// (id = 1, value = 13)
        0x05, 0x00, 0x00, 0x00,// (sizeof "Alice")
        0x41, 0x6C, 0x69, 0x63, 0x65,// ("Alice")
        0x0F, 0x00, 0x00, 0x00,// (sizeof child 2)
        0x02, 0x00,// (fn = 2)
        0x00, 0x00,// (id = 0, value in data part)
        0x0C, 0x00,// (id = 1, value = 5)
        0x05, 0x00, 0x00, 0x00,// (sizeof "Carol")
        0x43, 0x61, 0x72, 0x6F, 0x6C,// ("Carol")
    ]);
    let rs = sproto.decode("Person", buf);
    if (rs instanceof Error) {
        assert.fail(rs.message);
    } else {
        assert.deepEqual(need, rs);
    }
}

function decodeData1(): void {
    let need = {
        numbers : [ 1,2,3,4,5 ]
    };
    let buf = new Uint8Array([
        0x01, 0x00,// (fn = 1)
        0x00, 0x00,// (id = 0, value in data part)
        0x15, 0x00, 0x00, 0x00,// (sizeof numbers)
        0x04, //( sizeof int32 )
        0x01, 0x00, 0x00, 0x00,// (1)
        0x02, 0x00, 0x00, 0x00,// (2)
        0x03, 0x00, 0x00, 0x00,// (3)
        0x04, 0x00, 0x00, 0x00,// (4)
        0x05, 0x00, 0x00, 0x00,// (5)
    ]);
    let rs = sproto.decode("Data", buf);
    if (rs instanceof Error) {
        assert.fail(rs.message);
    } else {
        assert.deepEqual(need, rs);
    }
}

function decodeData2(): void {
    let value = integer64LeftShift(1, 32);
    let need = {
        numbers : [ 
            value + 1,
            value + 2,
            value + 3,
        ]
    };
    let buf = new Uint8Array([
        0x01, 0x00,// (fn = 1)
        0x00, 0x00,// (id = 0, value in data part)
        0x19, 0x00, 0x00, 0x00,// (sizeof numbers)
        0x08, //( sizeof int64 )
        0x01, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00,// ( (1<32) + 1)
        0x02, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00,// ( (1<32) + 2)
        0x03, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00,// ( (1<32) + 3)
    ]);
    let rs = sproto.decode("Data", buf);
    if (rs instanceof Error) {
        assert.fail(rs.message);
    } else {
        assert.deepEqual(need, rs);
    }
}

function decodeData3(): void {
    let need = {
        bools: [
            false,
            true,
            false,
        ],
    };
    
    let buf: Uint8Array = new Uint8Array([
        0x02, 0x00,// (fn = 2)
        0x01, 0x00,// (skip id = 0)
        0x00, 0x00,// (id = 1, value in data part)

        0x03, 0x00, 0x00, 0x00,// (sizeof bools)
        0x00,// (false)
        0x01,// (true)
        0x00,// (false)
    ]);
    let rs = sproto.decode("Data", buf);
    if (rs instanceof Error) {
        assert.fail(rs.message);
    } else {
        assert.deepEqual(need, rs);
    }
}

function decodeData4(): void {
    let need = {
        number: 100000,
        bignumber: -10000000000,
    };
    
    let buf: Uint8Array = new Uint8Array([
        0x03, 0x00,// (fn = 3)
        0x03, 0x00,// (skip id = 1)
        0x00, 0x00,// (id = 2, value in data part)
        0x00, 0x00,// (id = 3, value in data part)
        
        0x04, 0x00, 0x00, 0x00,// (sizeof number, data part)
        0xA0, 0x86, 0x01, 0x00,// (100000, 32bit integer)
        
        0x08, 0x00, 0x00, 0x00,// (sizeof bignumber, data part)
        0x00, 0x1C, 0xF4, 0xAB, 0xFD, 0xFF, 0xFF, 0xFF, //(-10000000000, 64bit integer)
    ]);
    let rs = sproto.decode("Data", buf);
    if (rs instanceof Error) {
        assert.fail(rs.message);
    } else {
        assert.deepEqual(need, rs);
    }
}

function decodeData5(): void {
    let need = {
        double : 0.01171875,
        doubles : [0.01171875, 23, 4]
    };
    
    let buf: Uint8Array = new Uint8Array([
        0x03, 0x00,// (fn = 3)
        0x07, 0x00,// (skip id = 3)
        0x00, 0x00,// (id = 4, value in data part)
        0x00, 0x00,// (id = 5, value in data part)

        0x08, 0x00, 0x00, 0x00,// (sizeof number, data part)
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x88, 0x3f,// (0.01171875, 64bit double)

        0x19, 0x00, 0x00, 0x00,// (sizeof doubles)
        0x08,// (sizeof double)
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x88, 0x3f,// (0.01171875, 64bit double)
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x37, 0x40,// (23, 64bit double)
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x10, 0x40,// (4, 64bit double)
    ]);
    let rs:any = sproto.decode("Data", buf);
    if (rs instanceof Error) {
        assert.fail(rs.message);
    } else {
        let isEqual = compareFloat(need.double, rs.double, 8);
        assert.equal(isEqual, true, "double comapre");
        isEqual = compareFloats(need.doubles, rs.doubles, 8);
        assert.equal(isEqual, true, "doubles comapre");
    }
}

function decodeData6(): void {
    let need = {
        fpn: 1.82
    };
    
    let buf: Uint8Array = new Uint8Array([
        0x02, 0x00,// (fn = 2)
        0x0b, 0x00,// (skip id = 5)
        0x6e, 0x01,// (id = 6, value = 0x16e/2 - 1 = 182)
    ]);
    let rs:any = sproto.decode("Data", buf);
    if (rs instanceof Error) {
        assert.fail(rs.message);
    } else {
        let isEqual = compareFloat(need.fpn, rs.fpn, 4);
        assert.equal(isEqual, true, "double comapre");
    }
}

mocha.describe("decode", function () {

    mocha.it("parse", parse);
    mocha.it("decode_person_1", decodePerson1);
    mocha.it("decode_person_2", decodePerson2);
    mocha.it("decode_data_1", decodeData1);
    mocha.it("decode_data_2", decodeData2);
    mocha.it("decode_data_3", decodeData3);
    mocha.it("decode_data_4", decodeData4);
    mocha.it("decode_data_5", decodeData5);
    mocha.it("decode_data_6", decodeData6);
});