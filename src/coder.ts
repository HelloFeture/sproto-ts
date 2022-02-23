import {
    Type,
} from "./meta";


export interface ITypeProvider {
    getTypeByName(name: string): Type | undefined;
}
