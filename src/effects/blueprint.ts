import { AOEEffectBlueprint, BlueprintFunction, BlueprintValueUnresolved, ConeBlueprint, EffectBlueprint, ErrorOr, ProjectileBlueprint, Variables } from "../types/blueprint";
import { EffectInstruction, MessageType } from "../types/messageListener";
import { Metadata, Vector2 } from "@owlbear-rodeo/sdk";

import { AOEEffectMessage } from "../types/aoe";
import { ConeMessage } from "../types/cone";
import { ProjectileMessage } from "../types/projectile";
import { blueprintFunctions } from "./blueprintFunctions";
import { log_error } from "../logging";

function _error(message: string): ErrorOr<never> {
    return { error: message };
}

function _value<T>(value: T): ErrorOr<T> {
    return { value };
}

function isError<T>(value: ErrorOr<T>): value is { error: string } {
    return value.error != undefined;
}

function isBlueprintFunction(value: unknown): value is BlueprintFunction {
    return (value as BlueprintFunction).name != undefined && (value as BlueprintFunction).arguments != undefined;
}

function isBlueprintVariable(value: unknown): value is string {
    return typeof value === "string" && value.startsWith("$");
}

function isUnresolvedBlueprint(value: unknown): value is BlueprintValueUnresolved {
    return isBlueprintFunction(value) || isBlueprintVariable(value);
}

function parseBlueprintVariable<T>(variable: string, variables: Variables): ErrorOr<T> {
    let currentVariable = variables;
    const variablePath: string[] = [];
    for (const exprPart of variable.slice(1).split(".")) {
        const exprRegex = /^([a-zA-Z_]+)(?:\[(-?\d+)\])?$/;
        const match = exprRegex.exec(exprPart);
        if (match == null) {
            log_error(`Invalid blueprint: malformatted variable "${variable}"`);
            return _error("malformatted variable");
        }
        const [variableName, variableIndexString] = [match[1], match[2]];
        if (currentVariable[variableName] == undefined) {
            if (currentVariable == variables) {
                log_error(`Invalid blueprint: undefined variable "${variableName}"`);
            }
            else {
                log_error(`Invalid blueprint: undefined property "${variableName}" of "${variablePath.join(".")}"`);
            }
            return _error("undefined variable");
        }
        const index = variableIndexString == undefined ? undefined : parseInt(variableIndexString);
        const tempVariable = currentVariable[variableName];

        let element = undefined;
        if (index != undefined) {
            if (!Array.isArray(tempVariable)) {
                log_error(`Invalid blueprint: trying to index non-array variable "${variableName}"`);
                return _error("trying to index non-array variable");
            }
            const realIndex = index >= 0 ? index : tempVariable.length + index;
            if (realIndex < 0) {
                log_error(`Invalid blueprint: index ${variableName}[${index}] out of range (length is ${tempVariable.length})`);
                return _error("index out of range");
            }
            element = tempVariable[realIndex];
            if (element == undefined) {
                log_error(`Invalid blueprint: index ${index} is out of range for array "${variablePath.join(".")}${variableName}"`);
                return _error("index out of range");
            }
        }
        else {
            element = tempVariable;
        }
        currentVariable = element;
        variablePath.push(exprPart);
    }
    return _value(currentVariable as T);
}

function parseBlueprintFunction<T>(func: BlueprintFunction, variables: Variables): ErrorOr<T> {
    const functionName = func.name;
    const functionArguments = func.arguments;

    const builtinFunction = blueprintFunctions[functionName];
    if (builtinFunction == undefined) {
        log_error(`Invalid blueprint: undefined function "${functionName}"`);
        return _error("undefined function");
    }

    const resolvedArguments: unknown[] = [];
    for (const argument of functionArguments) {
        if (isUnresolvedBlueprint(argument)) {
            const maybeResolvedArgument = parseExpression<T>(argument, variables);
            if (isError(maybeResolvedArgument)) {
                return _error(maybeResolvedArgument.error);
            }
            resolvedArguments.push(maybeResolvedArgument.value);
        }
        else {
            resolvedArguments.push(argument);
        }
    }

    try {
        const result = builtinFunction(...resolvedArguments);
        return _value(result as T);
    }
    catch (e: unknown) {
        log_error(`Invalid blueprint: error while executing function "${functionName}" (${(e as Error).message})`);
        return _error("error while executing function");
    }
}

function parseExpression<T = unknown>(expression: BlueprintValueUnresolved, variables: Variables): ErrorOr<T> {
    if (isBlueprintVariable(expression)) {
        return parseBlueprintVariable<T>(expression, variables);
    }
    return parseBlueprintFunction<T>(expression, variables);
}

function parseBlueprint(element: EffectBlueprint, message: EffectInstruction[], variables: Variables): ErrorOr<EffectBlueprint> {
    if (element.type === "spell") {
        log_error("Invalid blueprint: type spell is not supported");
        return _error("type spell is not supported");
    }

    let id: string|undefined;
    if (element.id != undefined) {
        if (typeof element.id === "string" && element.id[0] !== "$") {
            id = element.id;
        }
        else if (isUnresolvedBlueprint(element.id)) {
            const maybeId = parseExpression<string>(element.id, variables);
            if (isError(maybeId)) {
                return _error(maybeId.error);
            }
            id = maybeId.value;
        }
        else {
            log_error("Invalid blueprint: ID must be a string");
            return _error("ID must be a string");
        }
    }

    let delay: number|undefined;
    if (element.delay != undefined) {
        if (typeof element.delay === "number") {
            delay = element.delay;
        }
        else if (isUnresolvedBlueprint(element.delay)) {
            const maybeDelay = parseExpression<number>(element.delay, variables);
            if (isError(maybeDelay)) {
                return _error(maybeDelay.error);
            }
            delay = maybeDelay.value;
        }
        else {
            log_error("Invalid blueprint: delay must be a number");
            return _error("delay must be a number");
        }
    }

    let duration: number|undefined;
    if (element.duration != undefined) {
        if (typeof element.duration === "number") {
            duration = element.duration;
        }
        else if (isUnresolvedBlueprint(element.duration)) {
            const maybeDuration = parseExpression<number>(element.duration, variables);
            if (isError(maybeDuration)) {
                return _error(maybeDuration.error);
            }
            duration = maybeDuration.value;
        }
        else {
            log_error("Invalid blueprint: duration must be a number");
            return _error("duration must be a number");
        }
    }

    let loops: number|undefined;
    if (element.loops != undefined) {
        if (typeof element.loops === "number") {
            loops = element.loops;
        }
        else if (isUnresolvedBlueprint(element.loops)) {
            const maybeLoops = parseExpression<number>(element.loops, variables);
            if (isError(maybeLoops)) {
                return _error(maybeLoops.error);
            }
            loops = maybeLoops.value;
        }
        else {
            log_error("Invalid blueprint: loops must be a number");
            return _error("loops must be a number");
        }
    }

    let attachedTo: string|undefined;
    if (element.attachedTo != undefined) {
        if (isUnresolvedBlueprint(element.attachedTo)) {
            const maybeAttachedTo = parseExpression<string>(element.attachedTo, variables);
            if (isError(maybeAttachedTo)) {
                return _error(maybeAttachedTo.error);
            }
            attachedTo = maybeAttachedTo.value;
        }
        else if (typeof element.attachedTo === "string") {
            attachedTo = element.attachedTo;
        }
        else {
            log_error("Invalid blueprint: attachedTo must be a string");
            return _error("attachedTo must be a string");
        }
    }

    let disableHit: boolean|undefined;
    if (element.disableHit != undefined) {
        if (isUnresolvedBlueprint(element.disableHit)) {
            const maybeDisableHit = parseExpression<boolean>(element.disableHit, variables);
            if (isError(maybeDisableHit)) {
                return _error(maybeDisableHit.error);
            }
            disableHit = maybeDisableHit.value;
        }
        else if (typeof element.disableHit === "boolean") {
            disableHit = element.disableHit;
        }
        else {
            log_error("Invalid blueprint: disableHit must be a boolean");
            return _error("disableHit must be a boolean");
        }
    }

    let metadata: Metadata|undefined;
    if (element.metadata != undefined) {
        if (isUnresolvedBlueprint(element.metadata)) {
            const maybeMetadata = parseExpression<Metadata>(element.metadata, variables);
            if (isError(maybeMetadata)) {
                return _error(maybeMetadata.error);
            }
            metadata = maybeMetadata.value;
        }
        else if (typeof element.metadata === "object") {
            metadata = element.metadata;
        }
        else {
            log_error("Invalid blueprint: metadata must be an object");
            return _error("metadata must be an object");
        }
    }

    let actionArguments: unknown[]|undefined;
    if (element.arguments != undefined) {
        if (isUnresolvedBlueprint(element.arguments)) {
            const maybeArguments = parseExpression<unknown[]>(element.arguments, variables);
            if (isError(maybeArguments)) {
                return _error(maybeArguments.error);
            }
            actionArguments = maybeArguments.value;
        }
        else if (Array.isArray(element.arguments)) {
            const resolvedArguments = [];
            for (const argument of element.arguments) {
                if (isUnresolvedBlueprint(argument)) {
                    const maybeResolvedArgument = parseExpression<unknown>(argument, variables);
                    if (isError(maybeResolvedArgument)) {
                        return _error(maybeResolvedArgument.error);
                    }
                    resolvedArguments.push(maybeResolvedArgument.value);
                }
                else {
                    resolvedArguments.push(argument);
                }
            }
            actionArguments = resolvedArguments;
        }
        else {
            log_error("Invalid blueprint: arguments must be an array");
            return _error("arguments must be an array");
        }
    }

    if (loops != undefined && duration != undefined) {
        log_error("Invalid blueprint: can't specify both duration and loop");
        return _error("can't specify both duration and loop");
    }

    let effectProperties: ProjectileMessage | AOEEffectMessage | ConeMessage | undefined = undefined;
    if (element.effectProperties == undefined && element.type === "effect") {
        log_error("Invalid blueprint: missing effectProperties");
        return _error("missing effect properties");
    }
    const ukEffectProperties = element.effectProperties as unknown;
    if (element.effectProperties) {
        if (
            (ukEffectProperties as ProjectileBlueprint).copies != undefined &&
            (ukEffectProperties as ProjectileBlueprint).source != undefined &&
            (ukEffectProperties as ProjectileBlueprint).destination != undefined
        ) {
            const pbEffectProperties = ukEffectProperties as ProjectileBlueprint;

            let copies: number|undefined = 0;
            if (typeof pbEffectProperties.copies === "number") {
                copies = pbEffectProperties.copies;
            }
            else if (isUnresolvedBlueprint(pbEffectProperties.copies)) {
                const maybeCopies = parseExpression<number>(pbEffectProperties.copies, variables);
                if (isError(maybeCopies)) {
                    return _error(maybeCopies.error);
                }
                copies = maybeCopies.value!;
            }
            else {
                log_error(`Invalid blueprint: effectProperties.copies must be a number, not "${typeof pbEffectProperties.copies}"`);
                return _error("copies must be a number");
            }

            let source: Vector2|undefined =  { x: 0, y: 0 };
            if (isUnresolvedBlueprint(pbEffectProperties.source)) {
                const maybeSource = parseExpression<Vector2>(pbEffectProperties.source, variables);
                if (isError(maybeSource)) {
                    return _error(maybeSource.error);
                }
                source = maybeSource.value!;
            }
            else if (typeof pbEffectProperties.source.x === "number" && typeof pbEffectProperties.source.y === "number") {
                source.x = pbEffectProperties.source.x;
                source.y = pbEffectProperties.source.y;
            }
            else {
                log_error(`Invalid blueprint: effectProperties.source must be of the form { x: number, y: number }`);
                return _error("source must be a 2D vector");
            }

            let destination: Vector2|undefined = { x: 0, y: 0 };
            if (isUnresolvedBlueprint(pbEffectProperties.destination)) {
                const maybeDestination = parseExpression<Vector2>(pbEffectProperties.destination, variables);
                if (isError(maybeDestination)) {
                    return _error(maybeDestination.error);
                }
                destination = maybeDestination.value!;
            }
            else if (typeof pbEffectProperties.destination.x === "number" && typeof pbEffectProperties.destination.y === "number") {
                destination.x = pbEffectProperties.destination.x;
                destination.y = pbEffectProperties.destination.y;
            }
            else {
                log_error(`Invalid blueprint: effectProperties.destination must be of the form { x: number, y: number }`);
                return _error("destination must be a 2D vector");
            }

            effectProperties = {
                copies,
                source,
                destination,
            };
        }
        else if (
            (ukEffectProperties as ConeBlueprint).source != undefined &&
            (ukEffectProperties as ConeBlueprint).rotation != undefined &&
            (ukEffectProperties as ConeBlueprint).size != undefined
        ) {
            const cbEffectProperties = ukEffectProperties as ConeBlueprint;

            let source: Vector2|undefined =  { x: 0, y: 0 };
            if (isUnresolvedBlueprint(cbEffectProperties.source)) {
                const maybeSource = parseExpression<Vector2>(cbEffectProperties.source, variables);
                if (isError(maybeSource)) {
                    return _error(maybeSource.error);
                }
                source = maybeSource.value!;
            }
            else if (typeof cbEffectProperties.source.x === "number" && typeof cbEffectProperties.source.y === "number") {
                source.x = cbEffectProperties.source.x;
                source.y = cbEffectProperties.source.y;
            }
            else {
                log_error(`Invalid blueprint: effectProperties.source must be of the form { x: number, y: number }`);
                return _error("source must be a 2D vector");
            }

            let size: number = 0;
            if (typeof cbEffectProperties.size === "number") {
                size = cbEffectProperties.size;
            }
            else if (isUnresolvedBlueprint(cbEffectProperties.size)) {
                const maybeSize = parseExpression<number>(cbEffectProperties.size, variables);
                if (isError(maybeSize)) {
                    return _error(maybeSize.error);
                }
                size = maybeSize.value!;
            }
            else {
                log_error(`Invalid blueprint: effectProperties.size must be a number, not "${typeof cbEffectProperties.size}"`);
                return _error("size must be a number");
            }

            let rotation: number = 0;
            if (typeof cbEffectProperties.rotation === "number") {
                rotation = cbEffectProperties.rotation;
            }
            else if (isUnresolvedBlueprint(cbEffectProperties.rotation)) {
                const maybeSize = parseExpression<number>(cbEffectProperties.rotation, variables);
                if (isError(maybeSize)) {
                    return _error(maybeSize.error);
                }
                rotation = maybeSize.value!;
            }
            else {
                log_error(`Invalid blueprint: effectProperties.rotation must be a number, not "${typeof cbEffectProperties.rotation}"`);
                return _error("rotation must be a number");
            }

            effectProperties = {
                source,
                size,
                rotation
            };
        }
        else if (
            (ukEffectProperties as AOEEffectBlueprint).position != undefined
        ) {
            const abEffectProperties = ukEffectProperties as AOEEffectBlueprint;

            let position: Vector2|undefined =  { x: 0, y: 0 };
            if (isUnresolvedBlueprint(abEffectProperties.position)) {
                const maybePosition = parseExpression<Vector2>(abEffectProperties.position, variables);
                if (isError(maybePosition)) {
                    return _error(maybePosition.error);
                }
                position = maybePosition.value!;
            }
            else if (typeof abEffectProperties.position.x === "number" && typeof abEffectProperties.position.y === "number") {
                position.x = abEffectProperties.position.x;
                position.y = abEffectProperties.position.y;
            }
            else {
                log_error(`Invalid blueprint: effectProperties.position must be of the form { x: number, y: number }`);
                return _error("position must be a 2D vector");
            }

            let size: number = 0;
            if (typeof abEffectProperties.size === "number") {
                size = abEffectProperties.size;
            }
            else if (isUnresolvedBlueprint(abEffectProperties.size)) {
                const maybeSize = parseExpression<number>(abEffectProperties.size, variables);
                if (isError(maybeSize)) {
                    return _error(maybeSize.error);
                }
                size = maybeSize.value!;
            }
            else {
                log_error(`Invalid blueprint: effectProperties.size must be a number, not "${typeof abEffectProperties.size}"`);
                return _error("size must be a number");
            }

            effectProperties = {
                position,
                size
            };
        }
        else {
            log_error("Invalid blueprint: effectProperties cannot be parsed");
            return _error("invalid effect properties");
        }

        effectProperties = {
            ...effectProperties,
            attachedTo,
            disableHit
        }
    }

    if (element.blueprints != undefined && !Array.isArray(element.blueprints)) {
        log_error(`Invalid blueprint: blueprints must be an array, not "${typeof element.blueprints}"`);
        return _error("blueprints must be an array");
    }

    const instructions: EffectInstruction[] = [];
    if (element.blueprints != undefined) {
        const error = _resolveBlueprint(element.blueprints, instructions, variables);
        if (error) {
            return _error(error);
        }
    }

    const newInstruction: EffectInstruction = {
        id,
        type: element.type,
        effectProperties,
        delay,
        instructions,
        duration,
        loops,
        metadata,
        arguments: actionArguments
    };
    message.push(newInstruction);
    return _value(element);
}

function _resolveBlueprint(blueprint: EffectBlueprint[], message: EffectInstruction[], variables: Variables): string|undefined {
    if (!Array.isArray(blueprint)) {
        log_error("Invalid blueprint: blueprint must be an array");
        return "blueprint must be an array";
    }

    for (const instruction of blueprint) {
        const result = parseBlueprint(instruction, message, variables);
        if (result.error) {
            return result.error;
        }
    }
    return undefined;
}

export function resolveBlueprint(blueprint: string|EffectBlueprint[], variables: Variables): ErrorOr<MessageType> {
    try {
        const blueprintJSON = (typeof blueprint === "string" ? JSON.parse(blueprint) : blueprint) as EffectBlueprint[];
        const message: MessageType = { instructions: [] };

        const error = _resolveBlueprint(blueprintJSON, message.instructions, variables);
        return { value: message, error };
    }
    catch (e: unknown) {
        log_error(`Invalid blueprint: error while parsing JSON (${(e as Error).message})`);
        return { error: "error while parsing JSON" };
    }
}
