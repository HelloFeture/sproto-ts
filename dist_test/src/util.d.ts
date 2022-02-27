/**
 * copy from nodejs Buffer
 */
export declare function utf8ToBytes(str: string, units?: number): Array<number>;
export declare function utf8Slice(buf: ArrayBuffer, start: number, end: number): string;
export declare function integer64RightShift(num: number, offset: number): number;
export declare function integer64LeftShift(num: number, offset: number): number;
export declare function getIntegerBytes(num: number): number;
