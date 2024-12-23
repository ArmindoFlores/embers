import { BlueprintFunctionBuiltin } from "../types/blueprint";

function concat(...strings: unknown[]) {
    return String.prototype.concat(...(strings as string[]));
}

function product(...numbers: unknown[]) {
    return (numbers as number[]).reduce((acc, val) => acc * val, 1);
}

function sum(...numbers: unknown[]) {
    return (numbers as number[]).reduce((acc, val) => acc + val, 0);
}

export const blueprintFunctions: Record<string, BlueprintFunctionBuiltin> = {
    concat,
    product,
    sum,
};
