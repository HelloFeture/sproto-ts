import * as mocha from "mocha";
import * as assert from "assert";

import { Sproto } from "../src/sproto";
import { TextParser } from "../src/text-parser";

function parse1(): void {
    let sp =
`
.Persion1{
    a 0:integer
}
`;
    let sproto = new Sproto();
    let parser = new TextParser();
    let err = parser.parse(sproto, sp);
    if (err) {
        assert.fail(err.message);
    }
}

function parse2(): void {
    let sp =
`
.Persion2 # 12222
{
    a 0:integer
}
`;

    let sproto = new Sproto();
    let parser = new TextParser();
    let err = parser.parse(sproto, sp);
    if (err) {
        assert.fail(err.message);
    }
}

function parse3(): void {
    let sp =
`
.Persion3{
    a# c1
    0# c2
    :# c3
    integer
}
`;

    let sproto = new Sproto();
    let parser = new TextParser();
    let err = parser.parse(sproto, sp);
    if (err) {
        assert.fail(err.message);
    }
}

function parse4(): void {
    let sp =
`
.Persion4{
    a# c1
    0# c2
    :# c3
    integer(
        #ffff
        2
        #
    )
}
`;

    let sproto = new Sproto();
    let parser = new TextParser();
    let err = parser.parse(sproto, sp);
    if (err) {
        assert.fail(err.message);
    }
}

function parseProtocol1():void {
    let sp =
`
.User {
    nickName 0 : string
}
auth 1 {
    request {
        code 0 : string
        platform 1 : integer
    }

    response {
        result 0 : integer
        user 1 : User
    }
}   
`;

    let sproto = new Sproto();
    let parser = new TextParser();
    let err = parser.parse(sproto, sp);
    if (err) {
        assert.fail(err.message);
    }
}

function parseInvalid1(): void {
    let sp =
`
Persion4{
    a# c1
    0# c2
    :# c3
    integer(
        #ffff
        2
        #
    )
}
`;

    let sproto = new Sproto();
    let parser = new TextParser();
    let err = parser.parse(sproto, sp);
    if (!err) {
        assert.fail(err.message);
    }
}

function parseInvalid2(): void {
    let sp =
`
Persion 4 {
    a# c1
    0# c2
    :# c3
    integer(
        #ffff
        2
        #
    )
}
`;

    let sproto = new Sproto();
    let parser = new TextParser();
    let err = parser.parse(sproto, sp);
    if (!err) {
        assert.fail(err.message);
    }
}

mocha.describe("parse", function(){
    mocha.it("text_parse_1", parse1);
    mocha.it("text_parse_2", parse2);
    mocha.it("text_parse_3", parse3);
    mocha.it("text_parse_4", parse4);
    mocha.it("text_parse_protocol_1", parseProtocol1);
    mocha.it("text_parse_invalid_1", parseInvalid1);
    mocha.it("text_parse_invalid_2", parseInvalid2);
});