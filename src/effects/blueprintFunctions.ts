import { BlueprintFunctionBuiltin, BlueprintFunctionResolveArgs, BlueprintValue, ErrorOr } from "../types/blueprint";

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

export const blueprintFunctions: Record<string, BlueprintFunctionBuiltin> = {
    concat,
    product,
    sum,
    if: if_,
    rotation,
    equals,
    greater_than,
    lesser_than,
    random_choice,
    random_int,
};
