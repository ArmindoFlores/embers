import { Layer, Metadata } from "@owlbear-rodeo/sdk";

import { AOEEffectMessage } from "./aoe";
import { ConeMessage } from "./cone";
import { PossibleTarget } from "./blueprint";
import { ProjectileMessage } from "./projectile";

export interface EffectInstruction {
    // The name of the effect to play
    id?: string;
    // The type of effect (effect or action)
    type?: "effect" | "action";
    // Time to wait before starting this effect
    delay?: number;
    // Details about how to play this effect
    effectProperties?: ProjectileMessage | AOEEffectMessage | ConeMessage;
    // The duration, in milliseconds, to play this effect for
    duration?: number;
    // The number of loops to play for this effect
    loops?: number;
    // Where to execute this effect
    for?: PossibleTarget;
    // Whether the first target is the caster's token
    firstTargetIsCaster?: boolean;
    // Custom metadata to add to this effect
    metadata?: Metadata;
    // Which layer to play this effect on
    layer?: Layer;
    // If specified, the chosen effect variant will always be this one, if it exists
    forceVariant?: number;
    // Arguments if this instruction is an action
    arguments?: unknown[];
    // Instructions to execute after this effect is done
    instructions?: EffectInstruction[];
}

export interface MessageType {
    instructions: EffectInstruction[];
    spellData?: {
        name: string;
        caster: string;
    };
}
