import { BlueprintFunctionBuiltin } from "../types/blueprint";

function concat(...strings: unknown[]) {
    return String.prototype.concat(...(strings as string[]));
}

export const blueprintFunctions: Record<string, BlueprintFunctionBuiltin> = {
    concat
};
