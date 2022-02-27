"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mocha = require("mocha");
const assert = require("assert");
const text_parser_1 = require("../src/text-parser");
const util_1 = require("../src/util");
const util_2 = require("./util");
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
let sproto;
function parse() {
    let err = text_parser_1.TextParser.parse(sp);
    if (!(err instanceof Error)) {
        sproto = err;
    }
}
function decodePerson1() {
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
    }
    else {
        assert.deepEqual(need, rs);
    }
}
function decodePerson2() {
    let need = {
        name: "Bob",
        age: 40,
        children: [
            { name: "Alice", age: 13 },
            { name: "Carol", age: 5 },
        ]
    };
    let buf = new Uint8Array([
        0x04, 0x00,
        0x00, 0x00,
        0x52, 0x00,
        0x01, 0x00,
        0x00, 0x00,
        0x03, 0x00, 0x00, 0x00,
        0x42, 0x6F, 0x62,
        0x26, 0x00, 0x00, 0x00,
        0x0F, 0x00, 0x00, 0x00,
        0x02, 0x00,
        0x00, 0x00,
        0x1C, 0x00,
        0x05, 0x00, 0x00, 0x00,
        0x41, 0x6C, 0x69, 0x63, 0x65,
        0x0F, 0x00, 0x00, 0x00,
        0x02, 0x00,
        0x00, 0x00,
        0x0C, 0x00,
        0x05, 0x00, 0x00, 0x00,
        0x43, 0x61, 0x72, 0x6F, 0x6C, // ("Carol")
    ]);
    let rs = sproto.decode("Person", buf);
    if (rs instanceof Error) {
        assert.fail(rs.message);
    }
    else {
        assert.deepEqual(need, rs);
    }
}
function decodeData1() {
    let need = {
        numbers: [1, 2, 3, 4, 5]
    };
    let buf = new Uint8Array([
        0x01, 0x00,
        0x00, 0x00,
        0x15, 0x00, 0x00, 0x00,
        0x04,
        0x01, 0x00, 0x00, 0x00,
        0x02, 0x00, 0x00, 0x00,
        0x03, 0x00, 0x00, 0x00,
        0x04, 0x00, 0x00, 0x00,
        0x05, 0x00, 0x00, 0x00, // (5)
    ]);
    let rs = sproto.decode("Data", buf);
    if (rs instanceof Error) {
        assert.fail(rs.message);
    }
    else {
        assert.deepEqual(need, rs);
    }
}
function decodeData2() {
    let value = (0, util_1.integer64LeftShift)(1, 32);
    let need = {
        numbers: [
            value + 1,
            value + 2,
            value + 3,
        ]
    };
    let buf = new Uint8Array([
        0x01, 0x00,
        0x00, 0x00,
        0x19, 0x00, 0x00, 0x00,
        0x08,
        0x01, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00,
        0x02, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00,
        0x03, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, // ( (1<32) + 3)
    ]);
    let rs = sproto.decode("Data", buf);
    if (rs instanceof Error) {
        assert.fail(rs.message);
    }
    else {
        assert.deepEqual(need, rs);
    }
}
function decodeData3() {
    let need = {
        bools: [
            false,
            true,
            false,
        ],
    };
    let buf = new Uint8Array([
        0x02, 0x00,
        0x01, 0x00,
        0x00, 0x00,
        0x03, 0x00, 0x00, 0x00,
        0x00,
        0x01,
        0x00, // (false)
    ]);
    let rs = sproto.decode("Data", buf);
    if (rs instanceof Error) {
        assert.fail(rs.message);
    }
    else {
        assert.deepEqual(need, rs);
    }
}
function decodeData4() {
    let need = {
        number: 100000,
        bignumber: -10000000000,
    };
    let buf = new Uint8Array([
        0x03, 0x00,
        0x03, 0x00,
        0x00, 0x00,
        0x00, 0x00,
        0x04, 0x00, 0x00, 0x00,
        0xA0, 0x86, 0x01, 0x00,
        0x08, 0x00, 0x00, 0x00,
        0x00, 0x1C, 0xF4, 0xAB, 0xFD, 0xFF, 0xFF, 0xFF, //(-10000000000, 64bit integer)
    ]);
    let rs = sproto.decode("Data", buf);
    if (rs instanceof Error) {
        assert.fail(rs.message);
    }
    else {
        assert.deepEqual(need, rs);
    }
}
function decodeData5() {
    let need = {
        double: 0.01171875,
        doubles: [0.01171875, 23, 4]
    };
    let buf = new Uint8Array([
        0x03, 0x00,
        0x07, 0x00,
        0x00, 0x00,
        0x00, 0x00,
        0x08, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x88, 0x3f,
        0x19, 0x00, 0x00, 0x00,
        0x08,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x88, 0x3f,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x37, 0x40,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x10, 0x40, // (4, 64bit double)
    ]);
    let rs = sproto.decode("Data", buf);
    if (rs instanceof Error) {
        assert.fail(rs.message);
    }
    else {
        let isEqual = (0, util_2.compareFloat)(need.double, rs.double, 8);
        assert.equal(isEqual, true, "double comapre");
        isEqual = (0, util_2.compareFloats)(need.doubles, rs.doubles, 8);
        assert.equal(isEqual, true, "doubles comapre");
    }
}
function decodeData6() {
    let need = {
        fpn: 1.82
    };
    let buf = new Uint8Array([
        0x02, 0x00,
        0x0b, 0x00,
        0x6e, 0x01, // (id = 6, value = 0x16e/2 - 1 = 182)
    ]);
    let rs = sproto.decode("Data", buf);
    if (rs instanceof Error) {
        assert.fail(rs.message);
    }
    else {
        let isEqual = (0, util_2.compareFloat)(need.fpn, rs.fpn, 4);
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
