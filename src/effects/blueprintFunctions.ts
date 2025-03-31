import { BlueprintFunctionBuiltin, BlueprintFunctionDescription, BlueprintFunctionResolveArgs, BlueprintValue, ErrorOr } from "../types/blueprint";

import { SimplifiedItem } from "../types/misc";
import { Vector2 } from "@owlbear-rodeo/sdk";
import { getItemSize } from "../utils";

function _error(message: string): ErrorOr<never> {
    return { error: message };
}

function _value<T>(value: T): ErrorOr<T> {
    return { value };
}

function verifyCompatibleProductTypes(arg1: unknown, arg2: unknown)  {
    const [vArg1, vArg2] = [arg1, arg2] as Vector2[];
    let arg1ValueType: string = typeof arg1;
    let arg2ValueType: string = typeof arg2;
    if (arg1ValueType === "object" && vArg1.x != undefined && vArg1.y != undefined) {
        arg1ValueType = "vector";
    }
    if (arg2ValueType === "object" && vArg2.x != undefined && vArg2.y != undefined) {
        arg2ValueType = "vector";
    }

    if (arg1ValueType !== "number" && arg1ValueType !== "vector") {
        return `arguments must be "number" or "vector"`;
    }

    if (arg2ValueType !== "number" && arg2ValueType !== "vector") {
        return `arguments must be "number" or "vector"`;
    }

    return null;
}

function verifyCompatibleElementwiseTypes(arg1: unknown, arg2: unknown)  {
    const compatibleForProductError = verifyCompatibleProductTypes(arg1, arg2);
    if (compatibleForProductError) {
        return compatibleForProductError;
    }
    const [type1, type2] = [typeof arg1, typeof arg2];
    if (type1 !== type2) {
        return `incompatible types "${type1 !== "object" ? type1 : "vector"}" and "${type2 !== "object" ? type2 : "vector"}"`
    }
    return null;
}

function concat(resolve: BlueprintFunctionResolveArgs, ...args: BlueprintValue<unknown>[]) {
    const strings = args.map(arg => resolve(arg));
    for (const string of strings) {
        if (string.error) {
            return _error(string.error);
        }
    }
    return _value(String.prototype.concat(...strings.map(string => string.value as string)));
}

function product(resolve: BlueprintFunctionResolveArgs, ...args: BlueprintValue<unknown>[]) {
    const numbers = args.map(arg => resolve(arg));
    for (const number of numbers) {
        if (number.error) {
            return _error(number.error);
        }
    }
    return _value(numbers.map(number => number.value as number).reduce((acc, val) => acc * val, 1));
}

function sum(resolve: BlueprintFunctionResolveArgs, ...args: BlueprintValue<unknown>[]) {
    const numbers = args.map(arg => resolve(arg));
    for (const number of numbers) {
        if (number.error) {
            return _error(number.error);
        }
    }
    return _value(numbers.map(number => number.value as number).reduce((acc, val) => acc + val, 0));
}

function add(resolve: BlueprintFunctionResolveArgs, arg1: BlueprintValue<unknown>, arg2: BlueprintValue<unknown>) {
    const [left, right] = [resolve(arg1), resolve(arg2)];
    if (left.error) {
        return left;
    }
    if (right.error) {
        return right;
    }
    const [leftValue, rightValue] = [left.value, right.value];
    const typesMatchError = verifyCompatibleElementwiseTypes(leftValue, rightValue);
    if (typesMatchError) {
        return _error(`add(): ${typesMatchError}`);
    }
    if (typeof leftValue === "number") {
        return _value((leftValue as number) + (rightValue as number));
    }
    if (typeof leftValue === "object") {
        const [v1, v2] = [leftValue, rightValue] as Vector2[];
        return _value({
            x: v1.x + v2.x,
            y: v1.y + v2.y
        });
    }
    return _error("add(): invalid types");
}

function subtract(resolve: BlueprintFunctionResolveArgs, arg1: BlueprintValue<unknown>, arg2: BlueprintValue<unknown>) {
    const [left, right] = [resolve(arg1), resolve(arg2)];
    if (left.error) {
        return left;
    }
    if (right.error) {
        return right;
    }
    const [leftValue, rightValue] = [left.value, right.value];
    const typesMatchError = verifyCompatibleElementwiseTypes(leftValue, rightValue);
    if (typesMatchError) {
        return _error(`subtract(): ${typesMatchError}`);
    }
    if (typeof leftValue === "number") {
        return _value((leftValue as number) - (rightValue as number));
    }
    if (typeof leftValue === "object") {
        const [v1, v2] = [leftValue, rightValue] as Vector2[];
        return _value({
            x: v1.x - v2.x,
            y: v1.y - v2.y
        });
    }
    return _error("subtract(): invalid types");
}

function multiply(resolve: BlueprintFunctionResolveArgs, arg1: BlueprintValue<unknown>, arg2: BlueprintValue<unknown>) {
    const [left, right] = [resolve(arg1), resolve(arg2)];
    if (left.error) {
        return left;
    }
    if (right.error) {
        return right;
    }
    const [leftValue, rightValue] = [left.value, right.value];
    const typesMatchError = verifyCompatibleProductTypes(leftValue, rightValue);
    if (typesMatchError) {
        return _error(`multiply(): ${typesMatchError}`);
    }
    if (typeof leftValue === "number" && typeof rightValue === "number") {
        return _value((leftValue as number) * (rightValue as number));
    }
    if (typeof leftValue === "number" && typeof rightValue === "object") {
        return _value({
            x: (rightValue as Vector2).x * leftValue,
            y: (rightValue as Vector2).y * leftValue,
        });
    }
    if (typeof leftValue === "object" && typeof rightValue === "number") {
        return _value({
            x: (leftValue as Vector2).x * rightValue,
            y: (leftValue as Vector2).y * rightValue,
        });
    }
    if (typeof leftValue === "object" && typeof rightValue === "object") {
        const [v1, v2] = [leftValue, rightValue] as Vector2[];
        return _value({
            x: v1.x * v2.x,
            y: v1.y * v2.y
        });
    }
    return _error("multiply(): invalid types");
}

function divide(resolve: BlueprintFunctionResolveArgs, arg1: BlueprintValue<unknown>, arg2: BlueprintValue<unknown>) {
    const [left, right] = [resolve(arg1), resolve(arg2)];
    if (left.error) {
        return left;
    }
    if (right.error) {
        return right;
    }
    const [leftValue, rightValue] = [left.value, right.value];
    const typesMatchError = verifyCompatibleProductTypes(leftValue, rightValue);
    if (typesMatchError) {
        return _error(`divide(): ${typesMatchError}`);
    }
    if (typeof leftValue === "number" && typeof rightValue === "number") {
        return _value((leftValue as number) / (rightValue as number));
    }
    if (typeof leftValue === "number" && typeof rightValue === "object") {
        return _value({
            x: (rightValue as Vector2).x / leftValue,
            y: (rightValue as Vector2).y / leftValue,
        });
    }
    if (typeof leftValue === "object" && typeof rightValue === "number") {
        return _value({
            x: (leftValue as Vector2).x / rightValue,
            y: (leftValue as Vector2).y / rightValue,
        });
    }
    if (typeof leftValue === "object" && typeof rightValue === "object") {
        const [v1, v2] = [leftValue, rightValue] as Vector2[];
        return _value({
            x: v1.x / v2.x,
            y: v1.y / v2.y
        });
    }
    return _error("divide(): invalid types");
}

function if_(resolve: BlueprintFunctionResolveArgs, condition: BlueprintValue<unknown>, success: BlueprintValue<unknown>, failure?: BlueprintValue<unknown>) {
    const predicate = resolve(condition);
    if (predicate.error) {
        return _error(predicate.error);
    }
    if (predicate.value) {
        return resolve(success);
    }
    else if (failure != undefined) {
        return resolve(failure);
    }
    else {
        return _value(undefined);
    }
}

function and(resolve: BlueprintFunctionResolveArgs, ...args: BlueprintValue<unknown>[]) {
    for (const arg of args) {
        const expr = resolve(arg);
        if (expr.error) {
            return _error(expr.error);
        }
        if (!expr.value) {
            return _value(false);
        }
    }
    return _value(true);
}

function or(resolve: BlueprintFunctionResolveArgs, ...args: BlueprintValue<unknown>[]) {
    for (const arg of args) {
        const expr = resolve(arg);
        if (expr.error) {
            return _error(expr.error);
        }
        if (expr.value) {
            return _value(true);
        }
    }
    return _value(false);
}

function not(resolve: BlueprintFunctionResolveArgs, arg: BlueprintValue<unknown>) {
    const expr = resolve(arg);
    if (expr.error) {
        return _error(expr.error);
    }
    return _value(!expr.value);
}

function equals(resolve: BlueprintFunctionResolveArgs, arg1: BlueprintValue<unknown>, arg2: BlueprintValue<unknown>) {
    const [left, right] = [resolve(arg1), resolve(arg2)];
    if (left.error) {
        return _error(left.error);
    }
    if (right.error) {
        return _error(right.error);
    }
    return _value(left.value === right.value);
}

function not_equals(resolve: BlueprintFunctionResolveArgs, arg1: BlueprintValue<unknown>, arg2: BlueprintValue<unknown>) {
    const [left, right] = [resolve(arg1), resolve(arg2)];
    if (left.error) {
        return _error(left.error);
    }
    if (right.error) {
        return _error(right.error);
    }
    return _value(left.value !== right.value);
}

function greater_than(resolve: BlueprintFunctionResolveArgs, arg1: BlueprintValue<unknown>, arg2: BlueprintValue<unknown>) {
    const [left, right] = [resolve(arg1), resolve(arg2)];
    if (left.error) {
        return _error(left.error);
    }
    if (right.error) {
        return _error(right.error);
    }
    return _value((left.value as number) > (right.value as number));
}

function lesser_than(resolve: BlueprintFunctionResolveArgs, arg1: BlueprintValue<unknown>, arg2: BlueprintValue<unknown>) {
    const [left, right] = [resolve(arg1), resolve(arg2)];
    if (left.error) {
        return _error(left.error);
    }
    if (right.error) {
        return _error(right.error);
    }
    return _value((left.value as number) < (right.value as number));
}

function rotation(resolve: BlueprintFunctionResolveArgs, arg1: BlueprintValue<unknown>, arg2: BlueprintValue<unknown>) {
    const [source, destination] = [resolve(arg1), resolve(arg2)];
    if (source.error) {
        return _error(source.error);
    }
    if (destination.error) {
        return _error(destination.error);
    }
    const deltaX = (destination.value as Vector2).x - (source.value as Vector2).x;
    const deltaY = (destination.value as Vector2).y - (source.value as Vector2).y;
    const angleRadians = Math.atan2(deltaY, deltaX);
    const angleDegrees = angleRadians * (180 / Math.PI);
    return _value(angleDegrees);
}

function random_choice(resolve: BlueprintFunctionResolveArgs, ...args: BlueprintValue<unknown>[]) {
    const resolvedArgs = [];
    for (const arg of args) {
        const resolved = resolve(arg);
        if (resolved.error != undefined) {
            return _error(resolved.error);
        }
        resolvedArgs.push(resolved.value);
    }
    const index = Math.floor(Math.random() * args.length);
    return _value(resolvedArgs[index]);
}

function random_int(resolve: BlueprintFunctionResolveArgs, arg1: BlueprintValue<unknown>, arg2: BlueprintValue<unknown>) {
    const [min, max] = [resolve(arg1), resolve(arg2)];
    if (min.error) {
        return _error(min.error);
    }
    if (max.error) {
        return _error(max.error);
    }
    return _value(Math.floor(Math.random() * (max.value as number - (min.value as number))) + (min.value as number));
}

function index_of(resolve: BlueprintFunctionResolveArgs, arg1: BlueprintValue<unknown>, arg2: BlueprintValue<unknown>) {
    const [obj, array] = [resolve(arg1), resolve(arg2)];
    if (obj.error) {
        return _error(obj.error);
    }
    if (array.error) {
        return _error(array.error);
    }
    if (!Array.isArray(array.value)) {
        return _error("the second argument of index_of must be an array");
    }
    const index = (array.value as unknown[]).findIndex(possibleObj => JSON.stringify(possibleObj) === JSON.stringify(obj.value));
    return _value(index != -1 ? index : undefined);
}

function token_size(resolve: BlueprintFunctionResolveArgs, arg: BlueprintValue<unknown>) {
    const maybeToken = resolve(arg);
    if (maybeToken.error) {
        return _error(maybeToken.error);
    }
    const token = maybeToken.value as SimplifiedItem;
    return _value(getItemSize(token));
}

function target_in_range(resolve: BlueprintFunctionResolveArgs, arg1: BlueprintValue<unknown>, arg2: BlueprintValue<unknown>) {
    const globalTargets = resolve("$globalTargets");
    if (globalTargets.error) {
        return globalTargets;
    }
    const [min, max, index] = [resolve(arg1), resolve(arg2), index_of(resolve, "$targets[0]", globalTargets.value)];
    if (min.error) {
        return min;
    }
    if (max.error) {
        return max;
    }
    if (index.error) {
        return index;
    }
    const minValue = min.value as number;
    let maxValue = max.value ? (max.value as number) : (minValue + 1);
    if (maxValue < 0) {
        maxValue = (globalTargets.value as unknown[])!.length as number + maxValue + 1;
    }

    return _value(index.value != undefined && index.value >= minValue && index.value < maxValue);
}

function target_not_in_range(resolve: BlueprintFunctionResolveArgs, arg1: BlueprintValue<unknown>, arg2: BlueprintValue<unknown>) {
    const targetInRange = target_in_range(resolve, arg1, arg2);
    if (targetInRange.error) {
        return targetInRange;
    }
    return _value(!targetInRange.value);
}

export const blueprintFunctions: Record<string, { func: BlueprintFunctionBuiltin, desc: BlueprintFunctionDescription }> = {
    concat: {
        func: concat,
        desc: {
            minArgs: 1,
            description: "Concatenate one or more strings",
            argumentType: "string",
            returnType: "string"
        }
    },
    product: {
        func: product,
        desc: {
            minArgs: 1,
            description: "Multiply all arguments together",
            argumentType: "number",
            returnType: "number"
        }
    },
    sum: {
        func: sum,
        desc: {
            minArgs: 1,
            description: "Add all arguments together",
            argumentType: "number",
            returnType: "number"
        }
    },
    add: {
        func: add,
        desc: {
            minArgs: 2,
            maxArgs: 2,
            description: "Adds the first and the second argument. If both arguments are vectors, performs element-wise addition.",
            argumentType: "[number|vector, number|vector]",
            returnType: "number|vector"
        }
    },
    subtract: {
        func: subtract,
        desc: {
            minArgs: 2,
            maxArgs: 2,
            description: "Subtracts the second argument from the first. If both arguments are vectors, performs element-wise subtraction.",
            argumentType: "[number|vector, number|vector]",
            returnType: "number|vector"
        }
    },
    multiply: {
        func: multiply,
        desc: {
            minArgs: 2,
            maxArgs: 2,
            description: "Multiplies the first argument by the second. If one argument is a vector, both elements are multiplied by the scalar. If both arguments are vectors, performs element-wise multiplication.",
            argumentType: "[number|vector, number|vector]",
            returnType: "number|vector"
        }
    },
    divide: {
        func: divide,
        desc: {
            minArgs: 2,
            maxArgs: 2,
            description: "Divides the first argument by the second. If one argument is a vector, both elements are divided by the scalar. If both arguments are vectors, performs element-wise division.",
            argumentType: "[number|vector, number|vector]",
            returnType: "number|vector"
        }
    },
    and: {
        func: and,
        desc: {
            minArgs: 1,
            description: "Return \"true\" if all arguments are truthy, otherwise return \"false\"",
            argumentType: "any",
            returnType: "boolean"
        }
    },
    or: {
        func: or,
        desc: {
            minArgs: 1,
            description: "Return \"true\" if any argument is truthy, otherwise return \"false\"",
            argumentType: "any",
            returnType: "boolean"
        }
    },
    not: {
        func: not,
        desc: {
            minArgs: 1,
            maxArgs: 1,
            description: "Return \"true\" if the argument is falsy, otherwise return \"false\"",
            argumentType: "any",
            returnType: "boolean"
        }
    },
    if: {
        func: if_,
        desc: {
            minArgs: 2,
            maxArgs: 3,
            description: "Returns the second argument if the first argument is truthy, otherwise returns the third argument",
            argumentType: "any",
            returnType: "any"
        }
    },
    rotation: {
        func: rotation,
        desc: {
            minArgs: 2,
            maxArgs: 2,
            description: "Computes the angle of a vector connecting the first and the second arguments",
            argumentType: "vector",
            returnType: "number"
        }
    },
    equals: {
        func: equals,
        desc: {
            minArgs: 2,
            maxArgs: 2,
            description: "Returns \"true\" if the first argument is equal to the second argument, otherwise returns \"false\"",
            argumentType: "any",
            returnType: "boolean"
        }
    },
    not_equals: {
        func: not_equals,
        desc: {
            minArgs: 2,
            maxArgs: 2,
            description: "Returns \"true\" if the first argument is different from the second argument, otherwise returns \"false\"",
            argumentType: "any",
            returnType: "boolean"
        }
    },
    greater_than: {
        func: greater_than,
        desc: {
            minArgs: 2,
            maxArgs: 2,
            description: "Returns \"true\" if the first argument is greater than the second argument, otherwise returns \"false\"",
            argumentType: "number",
            returnType: "boolean"
        }
    },
    lesser_than: {
        func: lesser_than,
        desc: {
            minArgs: 2,
            maxArgs: 2,
            description: "Returns \"true\" if the first argument is lesser than the second argument, otherwise returns \"false\"",
            argumentType: "number",
            returnType: "boolean"
        }
    },
    random_choice: {
        func: random_choice,
        desc: {
            minArgs: 1,
            description: "Randomly returns one of the provided arguments",
            argumentType: "any",
            returnType: "any"
        }
    },
    random_int: {
        func: random_int,
        desc: {
            minArgs: 2,
            maxArgs: 2,
            description: "Returns a random integer between the first and the second arguments",
            argumentType: "number",
            returnType: "number"
        }
    },
    index_of: {
        func: index_of,
        desc: {
            minArgs: 2,
            maxArgs: 2,
            description: "Returns the index of the first argument in the second argument, or undefined if it's not found",
            argumentType: "any",
            returnType: "number|undefined"
        }
    },
    token_size: {
        func: token_size,
        desc: {
            minArgs: 1,
            maxArgs: 1,
            description: "Returns the size of the greatest dimension of an item asset",
            argumentType: "asset",
            returnType: "number"
        }
    },
    target_not_in_range: {
        func: target_not_in_range,
        desc: {
            minArgs: 1,
            maxArgs: 2,
            description: "This function can be used in combination with the \"disabled\" property to only play effects for specific indices of targets.\nIf only one argument is specified, it will return true for the all targets but the one with that specific index; If two arguments are specified, it will return true for all targets outside the interval [arg1, arg2[; A negative number for arg2 sets the upper bound as the number of targets plus that number plus 1",
            argumentType: "number, number",
            returnType: "boolean"
        }
    },
    target_in_range: {
        func: target_in_range,
        desc: {
            minArgs: 1,
            maxArgs: 2,
            description: "This function can be used in combination with the \"disabled\" property to only play effects for specific indices of targets.\nIf only one argument is specified, it will return true for the target with that specific index; If two arguments are specified, it will return true for all targets in the interval [arg1, arg2[; A negative number for arg2 sets the upper bound as the number of targets plus that number plus 1",
            argumentType: "number, number",
            returnType: "boolean"
        }
    }
};
