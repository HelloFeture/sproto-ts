import * as fs from "fs";

enum eSize {
    length = 4,
    header = 2,
    field = 2,
}


class BinParser {

    public parse(sp: Sproto, bin: Buffer):Error {
        let offset = 0;

        
        return undefined;
    }

    private
}

class Sproto {
    private constructor(){}
    public static  fromBin(bin: Buffer): Sproto{
        let sp = new Sproto();
        let parser = new BinParser();
        let err = parser.parse(sp, bin);
        if (err) {
            return err;
        }
        return sp;
    }
}

let data = fs.readFileSync("./protocol.spb");
let sp = Sproto.fromBin(data);
if (sp instanceof Error) {
    console.error(sp);
} else {
    console.log("parser success");
}