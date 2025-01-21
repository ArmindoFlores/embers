import { Layer, Metadata, Vector2 } from "@owlbear-rodeo/sdk";

export type BlueprintValueUnresolved = string | BlueprintFunction;
export type BlueprintValue<T> = T | BlueprintValueUnresolved;
export type BlueprintType = "effect" | "spell" | "action";

export interface BlueprintFunction {
    name: string;
    arguments: BlueprintValue<unknown>[];
}

export interface ProjectileBlueprint {
    copies: BlueprintValue<number>;
    source: BlueprintValue<Vector2>;
    destination: BlueprintValue<Vector2>;
}

export interface AOEEffectBlueprint {
    source: BlueprintValue<Vector2>;
    size: BlueprintValue<number>;
    rotation?: BlueprintValue<number>;
}

export interface ConeBlueprint {
    source: BlueprintValue<Vector2>;
    rotation: BlueprintValue<number>;
    size: BlueprintValue<number>;
}

export interface EffectBlueprint {
    // Blueprint type
    type: BlueprintType;
    // Blueprint ID
    id: BlueprintValue<string>;
    // Time to wait before starting this effect
    delay?: BlueprintValue<number>;
    // The duration, in milliseconds, to play this effect for
    duration?: BlueprintValue<number>;
    // The number of loops to play for this effect
    loops?: BlueprintValue<number>;
    // What item to attach this effect to
    attachedTo?: BlueprintValue<string>;
    // Whether to disable hit detection
    disableHit?: BlueprintValue<boolean>;
    // Custom metadata to add to this effect
    metadata?: BlueprintValue<Metadata>;
    // What layer this effect goes in
    layer?: BlueprintValue<Layer>;
    // Details about how to play this effect
    effectProperties?: ProjectileBlueprint | AOEEffectBlueprint | ConeBlueprint;
    // Instructions to execute after this effect is done
    blueprints?: EffectBlueprint[];
    // Arguments for this action (if type is action)
    arguments?: BlueprintValue<unknown>[];
    // Whether to disregard this blueprint
    disabled?: BlueprintValue<boolean>;
    // If specified, the chosen effect variant will always be this one, if it exists
    forceVariant?: BlueprintValue<number>;
}

export interface ErrorOr<T> {
    error?: string;
    value?: T;
}

export type Variables = Record<string, unknown>;

export type BlueprintFunctionResolveArgs = (argument: BlueprintValue<unknown>) => ErrorOr<unknown>;
export type BlueprintFunctionBuiltin = (resolve: BlueprintFunctionResolveArgs,...args: BlueprintValue<unknown>[]) => ErrorOr<unknown>;
export interface BlueprintFunctionDescription {
    minArgs?: number;
    maxArgs?: number;
    description?: string;
    returnType?: string;
    argumentType?: string;
}

export type BlueprintActionBuiltin = (...args: unknown[]) => void;
export interface BlueprintActionDescription {
    minArgs?: number;
    maxArgs?: number;
    description?: string;
    argumentType?: string;
}
