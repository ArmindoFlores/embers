import { Vector2 } from "@owlbear-rodeo/sdk";

export type BlueprintValueUnresolved = string | BlueprintFunction;
export type BlueprintValue<T> = T | BlueprintValueUnresolved; 
export type BlueprintType = "effect" | "spell";

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
    position: BlueprintValue<Vector2>;
    size: BlueprintValue<number>;
}

export interface ConeBlueprint {
    source: BlueprintValue<Vector2>;
    destination: BlueprintValue<Vector2>;
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
    // Details about how to play this effect
    effectProperties?: ProjectileBlueprint | AOEEffectBlueprint | ConeBlueprint;
    // Instructions to execute after this effect is done
    blueprints?: EffectBlueprint[];
}

export interface ErrorOr<T> {
    error?: string;
    value?: T;
}

export type Variables = Record<string, unknown>;

export type BlueprintFunctionBuiltin = (...args: unknown[]) => unknown;
