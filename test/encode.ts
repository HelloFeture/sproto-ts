import {
    Sproto
} from "../src/sproto";
import {
    TextParser
} from "../src/text-parser";
import * as assert from "assert";
import * as mocha from "mocha";
import {
    arrayCompare,
} from "./util";
import { integer64LeftShift } from "../src/util";

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

interface IPerson {
    name?: string;
    age?: number;
    marital ?: boolean;
    children?: Array<IPerson>;
}

interface IData {
    numbers ?: Array<number>;
    bools ?:Array<boolean>;
    number ?: number;
    bignumber ?: number;
    double ?: number;
    doubles ?: Array<number>;
    fpn ?: number;
}

var sproto: Sproto;

function parse(): void {
    let err = TextParser.parse(sp);
    if (!(err instanceof Error)) {
        sproto = err;
    }
}

function encPerson1():void {
    let person: IPerson = {
        name : "Alice" ,  age : 13, marital : false
    };
    let expected = [
        0x03,0x00,
        0x00,0x00,
        0x1c,0x00,
        0x02,0x00,
        0x05,0x00,0x00,0x00,
        0x41,0x6c,0x69,0x63,0x65
    ];
    let rs = sproto.encode("Person", person);
    if (rs instanceof Error) {
        assert.fail(rs.message);
    } else {
        let isEqual = arrayCompare(rs, expected);
        assert.equal(isEqual, true, "encode1 encode Person error");
    }
}

function encPerson2(): void {
    let person: IPerson = {
        name : "Bob" ,  age : 40, children  : [
            {name : "Alice" ,  age : 13},
            {name : "Carol" ,  age : 5}
        ]
    };
    let expected = [
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
    ];
    let rs = sproto.encode("Person", person);
    if (rs instanceof Error) {
        assert.fail(rs.message);
    } else {
        let isEqual = arrayCompare(rs, expected);
        assert.equal(isEqual, true, "encode2 encode Person error");
    }
}

function encodeData1(): void {
    let data: IData = {
        numbers: [1,2,3,4,5],
    };
    const expected: Uint8Array = new Uint8Array([
        0x01, 0x00, //(fn = 1)
        0x00, 0x00, //(id = 0, value in data part)

        0x15, 0x00, 0x00, 0x00, //(sizeof numbers)
        0x04, //( sizeof int32 )
        0x01, 0x00, 0x00, 0x00, //(1)
        0x02, 0x00, 0x00, 0x00, //(2)
        0x03, 0x00, 0x00, 0x00, //(3)
        0x04, 0x00, 0x00, 0x00, //(4)
        0x05, 0x00, 0x00, 0x00, //(5)
    ]);
    let rs = sproto.encode("Data", data);
    if (rs instanceof Error) {
        assert.fail(rs.message);
    } else {
        let isEqual = arrayCompare(rs, expected);
        assert.equal(true, isEqual, "encode data_1 Data error");
        // assert.equal(expected, rs, "encode data_1 Data error");
    }
}

function encodeData2(): void {
    let value = integer64LeftShift(1, 32);
    let data: IData = {
        numbers: [
            value + 1,
            value + 2,
            value + 3,
        ],
    };
    
    const expected: Uint8Array = new Uint8Array([
        0x01, 0x00,// (fn = 1)
        0x00, 0x00,// (id = 0, value in data part)

        0x19, 0x00, 0x00, 0x00,// (sizeof numbers)
        0x08,// ( sizeof int64 )
        0x01, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00,// ( (1<32) + 1)
        0x02, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00,// ( (1<32) + 2)
        0x03, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00,// ( (1<32) + 3)
    ]);
    let rs = sproto.encode("Data", data);
    if (rs instanceof Error) {
        assert.fail(rs.message);
    } else {
        let isEqual = arrayCompare(rs, expected);
        assert.equal(true, isEqual, "encode data_2 Data error");
        // assert.equal(expected, rs, "encode data_2 Data error");
    }
}

function encodeData3(): void {
    
    let data: IData = {
        bools: [
            false,
            true,
            false,
        ],
    };
    
    const expected: Uint8Array = new Uint8Array([
        0x02, 0x00,// (fn = 2)
        0x01, 0x00,// (skip id = 0)
        0x00, 0x00,// (id = 1, value in data part)

        0x03, 0x00, 0x00, 0x00,// (sizeof bools)
        0x00,// (false)
        0x01,// (true)
        0x00,// (false)
    ]);
    let rs = sproto.encode("Data", data);
    if (rs instanceof Error) {
        assert.fail(rs.message);
    } else {
        let isEqual = arrayCompare(rs, expected);
        assert.equal(true, isEqual, "encode data_3 Data error");
        // assert.equal(expected, rs, "encode data_3 Data error");
    }
}

function encodeData4(): void {
    
    let data: IData = {
        number: 100000,
        bignumber: -10000000000,
    };
    
    const expected: Uint8Array = new Uint8Array([
        0x03, 0x00,// (fn = 3)
        0x03, 0x00,// (skip id = 1)
        0x00, 0x00,// (id = 2, value in data part)
        0x00, 0x00,// (id = 3, value in data part)
        
        0x04, 0x00, 0x00, 0x00,// (sizeof number, data part)
        0xA0, 0x86, 0x01, 0x00,// (100000, 32bit integer)
        
        0x08, 0x00, 0x00, 0x00,// (sizeof bignumber, data part)
        0x00, 0x1C, 0xF4, 0xAB, 0xFD, 0xFF, 0xFF, 0xFF, //(-10000000000, 64bit integer)
    ]);
    let rs = sproto.encode("Data", data);
    if (rs instanceof Error) {
        assert.fail(rs.message);
    } else {
        let isEqual = arrayCompare(rs, expected);
        assert.equal(true, isEqual, "encode data_4 Data error");
        // assert.equal(expected, rs, "encode data_4 Data error");
    }
}

function encodeData5(): void {
    
    let data: IData = {
        double : 0.01171875,
        doubles : [0.01171875, 23, 4]
    };
    
    const expected: Uint8Array = new Uint8Array([
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
    let rs = sproto.encode("Data", data);
    if (rs instanceof Error) {
        assert.fail(rs.message);
    } else {
        let isEqual = arrayCompare(rs, expected);
        assert.equal(true, isEqual, "encode data_5 Data error");
        // assert.equal(expected, rs, "encode data_5 Data error");
    }
}


function encodeData6(): void {
    
    let data: IData = {
        fpn: 1.82
    };
    
    const expected: Uint8Array = new Uint8Array([
        0x02, 0x00,// (fn = 2)
        0x0b, 0x00,// (skip id = 5)
        0x6e, 0x01,// (id = 6, value = 0x16e/2 - 1 = 182)
    ]);
    let rs = sproto.encode("Data", data);
    if (rs instanceof Error) {
        assert.fail(rs.message);
    } else {
        let isEqual = arrayCompare(rs, expected);
        assert.equal(true, isEqual, "encode data_6 Data error");
        // assert.equal(expected, rs, "encode data_6 Data error");
    }
}

mocha.describe("encode", function() {
    mocha.it("parse", parse);
    mocha.it("encode_person_1", encPerson1);
    mocha.it("encode_person_2", encPerson2);
    mocha.it("encode_data_1", encodeData1);
    mocha.it("encode_data_2", encodeData2);
    mocha.it("encode_data_3", encodeData3);
    mocha.it("encode_data_4", encodeData4);
    mocha.it("encode_data_5", encodeData5);
    mocha.it("encode_data_6", encodeData6);
});
