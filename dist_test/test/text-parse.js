"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mocha = require("mocha");
const assert = require("assert");
const text_parser_1 = require("../src/text-parser");
function parse1() {
    let sp = `
.Persion1{
    a 0:integer
}
`;
    let err = text_parser_1.TextParser.parse(sp);
    if (err instanceof Error) {
        assert.fail(err.message);
    }
}
function parse2() {
    let sp = `
.Persion2 # 12222
{
    a 0:integer
}
`;
    let err = text_parser_1.TextParser.parse(sp);
    if (err instanceof Error) {
        assert.fail(err.message);
    }
}
function parse3() {
    let sp = `
.Persion3{
    a# c1
    0# c2
    :# c3
    integer
}
`;
    let err = text_parser_1.TextParser.parse(sp);
    if (err instanceof Error) {
        assert.fail(err.message);
    }
}
function parse4() {
    let sp = `
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
    let err = text_parser_1.TextParser.parse(sp);
    if (err instanceof Error) {
        assert.fail(err.message);
    }
}
function parseProtocol1() {
    let sp = `
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
    let err = text_parser_1.TextParser.parse(sp);
    if (err instanceof Error) {
        assert.fail(err.message);
    }
}
function parseInvalid1() {
    let sp = `
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
    let err = text_parser_1.TextParser.parse(sp);
    if (!(err instanceof Error)) {
        assert.fail("invalid protocol");
    }
}
function parseInvalid2() {
    let sp = `
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
    let err = text_parser_1.TextParser.parse(sp);
    if (!(err instanceof Error)) {
        assert.fail("invalid protocol");
    }
}
mocha.describe("parse", function () {
    mocha.it("text_parse_1", parse1);
    mocha.it("text_parse_2", parse2);
    mocha.it("text_parse_3", parse3);
    mocha.it("text_parse_4", parse4);
    mocha.it("text_parse_protocol_1", parseProtocol1);
    mocha.it("text_parse_invalid_1", parseInvalid1);
    mocha.it("text_parse_invalid_2", parseInvalid2);
});
