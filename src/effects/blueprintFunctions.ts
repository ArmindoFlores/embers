import { BlueprintFunctionBuiltin } from "../types/blueprint";
import { Vector2 } from "@owlbear-rodeo/sdk";

function concat(...strings: unknown[]) {
    return String.prototype.concat(...(strings as string[]));
}

function product(...numbers: unknown[]) {
    return (numbers as number[]).reduce((acc, val) => acc * val, 1);
}

function sum(...numbers: unknown[]) {
    return (numbers as number[]).reduce((acc, val) => acc + val, 0);
}

function if_(condition: unknown, success: unknown, failure?: unknown) {
    if (condition) {
        return success;
    }
    else {
        return failure;
    }
}

function rotation(source: unknown, destination: unknown) {
    const deltaX = (destination as Vector2).x - (source as Vector2).x;
    const deltaY = (destination as Vector2).y - (source as Vector2).y;
    const angleRadians = Math.atan2(deltaY, deltaX);
    const angleDegrees = angleRadians * (180 / Math.PI);
    return angleDegrees;
}

export const blueprintFunctions: Record<string, BlueprintFunctionBuiltin> = {
    concat,
    product,
    sum,
    if: if_,
    rotation,
};
