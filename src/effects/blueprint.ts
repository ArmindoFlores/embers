import { AOEEffectBlueprint, BlueprintFunction, BlueprintValue, BlueprintValueUnresolved, ConeBlueprint, EffectBlueprint, ErrorOr, PossibleTarget, ProjectileBlueprint, Variables } from "../types/blueprint";
import { EffectInstruction, InteractionData, MessageType } from "../types/messageListener";
import { LOCAL_STORAGE_KEYS, getSettingsValue } from "../components/Settings";
import { Layer, Metadata, Vector2 } from "@owlbear-rodeo/sdk";

import { AOEEffectMessage } from "../types/aoe";
import { ConeMessage } from "../types/cone";
import { ProjectileMessage } from "../types/projectile";
import { actions } from "./actions";
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

export function isBlueprintFunction(value: unknown): value is BlueprintFunction {
    return value != undefined && (value as BlueprintFunction).name != undefined && (value as BlueprintFunction).arguments != undefined;
}

export function isBlueprintVariable(value: unknown): value is string {
    return typeof value === "string" && value.startsWith("$");
}

export function isUnresolvedBlueprint(value: unknown): value is BlueprintValueUnresolved {
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
        if (!Object.hasOwn(currentVariable, variableName)) {
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

    const builtinFunction = blueprintFunctions[functionName]?.func;
    if (builtinFunction == undefined) {
        log_error(`Invalid blueprint: undefined function "${functionName}"`);
        return _error("undefined function");
    }

    function resolve<T>(argument: BlueprintValue<T>) {
        if (isUnresolvedBlueprint(argument)) {
            const maybeResolvedArgument = parseExpression<T>(argument, variables);
            if (isError(maybeResolvedArgument)) {
                return _error(maybeResolvedArgument.error);
            }
            return _value(maybeResolvedArgument.value);
        }
        else {
            return _value(argument);
        }
    }

    try {
        const result = builtinFunction(resolve, ...functionArguments);
        return result as ErrorOr<T>;
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

export function resolveSimpleValue<T>(value: BlueprintValue<T> | undefined, variableName: string, variableType: string, variables: Variables) {
    let resolvedValue: T|undefined;
    if (value != undefined) {
        if (typeof value === variableType && (typeof value !== "string" || value[0] !== "$")) {
            resolvedValue = value as T;
        }
        else if (isUnresolvedBlueprint(value)) {
            const maybeDisabled = parseExpression<T>(value, variables);
            if (isError(maybeDisabled)) {
                return _error(maybeDisabled.error);
            }
            resolvedValue = maybeDisabled.value;
        }
        else {
            log_error(`Invalid blueprint: ${variableName} must be a ${variableType}`);
            return _error(`${variableName} must be a ${variableType}`);
        }
    }
    return _value(resolvedValue);
}

function parseBlueprint(element: EffectBlueprint, message: EffectInstruction[], interactions: InteractionData, variables: Variables): ErrorOr<EffectBlueprint> {
    if (element.type === "spell") {
        log_error("Invalid blueprint: type spell is not supported");
        return _error("type spell is not supported");
    }

    const maybeDisabled = resolveSimpleValue<boolean>(element.disabled, "disabled", "boolean", variables);
    if (isError(maybeDisabled)) {
        return maybeDisabled;
    }
    const disabled = maybeDisabled.value;
    if (disabled === true) {
        return _value(element);
    }

    const maybeID = resolveSimpleValue<string>(element.id, "ID", "string", variables);
    if (isError(maybeID)) {
        return maybeID;
    }
    const id = maybeID.value;

    const maybeDelay = resolveSimpleValue<number>(element.delay, "delay", "number", variables);
    if (isError(maybeDelay)) {
        return maybeDelay;
    }
    const delay = maybeDelay.value;

    const maybeDuration = resolveSimpleValue<number>(element.duration, "duration", "number", variables);
    if (isError(maybeDuration)) {
        return maybeDuration;
    }
    const duration = maybeDuration.value;

    const maybeLoops = resolveSimpleValue<number>(element.loops, "loops", "number", variables);
    if (isError(maybeLoops)) {
        return maybeLoops;
    }
    const loops = maybeLoops.value;

    const maybeFor = resolveSimpleValue<PossibleTarget>(element.for, "for", "string", variables);
    if (isError(maybeFor)) {
        return maybeFor;
    }
    const for_ = maybeFor.value;

    const maybeForceVariant = resolveSimpleValue<number>(element.forceVariant, "forceVariant", "number", variables);
    if (isError(maybeForceVariant)) {
        return maybeForceVariant;
    }
    const forceVariant = maybeForceVariant.value;

    const maybeAttachedTo = resolveSimpleValue<string>(element.attachedTo, "attachedTo", "number", variables);
    if (isError(maybeAttachedTo)) {
        return maybeAttachedTo;
    }
    const attachedTo = maybeAttachedTo.value;

    const maybeDisableHit = resolveSimpleValue<boolean>(element.disableHit, "disableHit", "boolean", variables);
    if (isError(maybeDisableHit)) {
        return maybeDisableHit;
    }
    const disableHit = maybeDisableHit.value;

    const maybeMetadata = resolveSimpleValue<Metadata>(element.metadata, "metadata", "object", variables);
    if (isError(maybeMetadata)) {
        return maybeMetadata;
    }
    const metadata = maybeMetadata.value;

    const maybeLayer = resolveSimpleValue<Layer>(element.layer, "layer", "string", variables);
    if (isError(maybeLayer)) {
        return maybeLayer;
    }
    const layer = maybeLayer.value;

    const maybeZIndex = resolveSimpleValue<number>(element.zIndex, "zIndex", "number", variables);
    if (isError(maybeZIndex)) {
        return maybeZIndex;
    }
    const zIndex = maybeZIndex.value;

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

            const maybeSourceId = resolveSimpleValue<string>(pbEffectProperties.sourceId, "sourceId", "string", variables);
            if (isError(maybeSourceId)) {
                return maybeSourceId;
            }
            const sourceId = maybeSourceId.value;

            const maybeDestinationId = resolveSimpleValue<string>(pbEffectProperties.destinationId, "destinationId", "string", variables);
            if (isError(maybeDestinationId)) {
                return maybeDestinationId;
            }
            const destinationId = maybeDestinationId.value;

            effectProperties = {
                copies,
                source,
                destination,
                sourceId,
                destinationId
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
            (ukEffectProperties as AOEEffectBlueprint).source != undefined
        ) {
            const abEffectProperties = ukEffectProperties as AOEEffectBlueprint;
            let source: Vector2|undefined =  { x: 0, y: 0 };
            if (isUnresolvedBlueprint(abEffectProperties.source)) {
                const maybePosition = parseExpression<Vector2>(abEffectProperties.source, variables);
                if (isError(maybePosition)) {
                    return _error(maybePosition.error);
                }
                source = maybePosition.value!;
            }
            else if (typeof abEffectProperties.source.x === "number" && typeof abEffectProperties.source.y === "number") {
                source.x = abEffectProperties.source.x;
                source.y = abEffectProperties.source.y;
            }
            else {
                log_error(`Invalid blueprint: effectProperties.source must be of the form { x: number, y: number }`);
                return _error("source must be a 2D vector");
            }

            let size: number = 0;
            if (typeof abEffectProperties.size === "number") {
                // FIXME: What if this value is a variable/function? Should we not multiply it?
                size = abEffectProperties.size * getSettingsValue(LOCAL_STORAGE_KEYS.GRID_SCALING_FACTOR);
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

            let rotation: number|undefined = undefined;
            if (typeof abEffectProperties.rotation === "number" || abEffectProperties.rotation == undefined) {
                rotation = abEffectProperties.rotation;
            }
            else if (isUnresolvedBlueprint(abEffectProperties.rotation)) {
                const maybeRotation = parseExpression<number>(abEffectProperties.rotation, variables);
                if (isError(maybeRotation)) {
                    return _error(maybeRotation.error);
                }
                rotation = maybeRotation.value!;
            }
            else {
                log_error(`Invalid blueprint: effectProperties.rotation must be a number, not "${typeof abEffectProperties.rotation}"`);
                return _error("rotation must be a number");
            }

            effectProperties = {
                source,
                size,
                rotation
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
        const error = _resolveBlueprint(element.blueprints, instructions, interactions, variables);
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
        for: for_,
        forceVariant,
        metadata,
        layer,
        zIndex,
        arguments: actionArguments
    };
    message.push(newInstruction);

    if (element.type === "action" && id) {
        const action = actions[id];
        if (action && action.desc.requiresItemInteraction && action.desc.itemIDsFromArgs) {
            for (const itemID of action.desc.itemIDsFromArgs(actionArguments)) {
                interactions.ids.push(itemID);
            }
            interactions.count++;
        }
    }

    return _value(element);
}

function _resolveBlueprint(blueprint: EffectBlueprint[], message: EffectInstruction[], interactions: InteractionData, variables: Variables): string|undefined {
    if (!Array.isArray(blueprint)) {
        log_error("Invalid blueprint: blueprint must be an array");
        return "blueprint must be an array";
    }

    for (const instruction of blueprint) {
        const result = parseBlueprint(instruction, message, interactions, variables);
        if (result.error) {
            return result.error;
        }
    }
    return undefined;
}

export function resolveBlueprint(blueprint: string|EffectBlueprint[], variables: Variables): ErrorOr<MessageType> {
    try {
        const blueprintJSON = (typeof blueprint === "string" ? JSON.parse(blueprint) : blueprint) as EffectBlueprint[];
        const message: MessageType = { instructions: [], interactions: { count: 0, ids: [] } };

        const interactions = {
            ids: [],
            count: 0
        };
        const error = _resolveBlueprint(blueprintJSON, message.instructions, interactions, variables);
        message.interactions = {
            ids: Array.from(interactions.ids.values()),
            count: interactions.count
        };
        return { value: message, error };
    }
    catch (e: unknown) {
        log_error(`Invalid blueprint: error while parsing JSON (${(e as Error).message})`);
        return { error: "error while parsing JSON" };
    }
}
