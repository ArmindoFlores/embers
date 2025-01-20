import { BlueprintFunctionBuiltin, BlueprintFunctionDescription, BlueprintFunctionResolveArgs, BlueprintValue, ErrorOr } from "../types/blueprint";

import { Vector2 } from "@owlbear-rodeo/sdk";

function _error(message: string): ErrorOr<never> {
    return { error: message };
}

function _value<T>(value: T): ErrorOr<T> {
    return { value };
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
};
