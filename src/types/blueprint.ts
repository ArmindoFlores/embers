import { Vector2 } from "@owlbear-rodeo/sdk";

export interface ProjectileBlueprint {
    copies: number|string;
    source: Vector2|string;
    destination: Vector2|string;
}

export interface AOEEffectBlueprint {
    position: Vector2|string;
}

export interface ConeBlueprint {
    source: Vector2|string;
    destination: Vector2|string;
}

export interface EffectBlueprint {
    // The name of the effect to play
    effectId?: string;
    // Time to wait before starting this effect
    delay?: number|string;
    // Details about how to play this effect
    effectInfo?: ProjectileBlueprint | AOEEffectBlueprint | ConeBlueprint;
    // Instructions to execute after this effect is done
    instructions?: EffectBlueprint[];
}
