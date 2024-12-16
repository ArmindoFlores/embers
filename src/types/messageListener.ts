import { AOEEffectMessage } from "./aoe";
import { ProjectileMessage } from "./projectile";

export interface EffectInstruction {
    // The name of the effect to play
    effectId?: string;
    // Time to wait before starting this effect
    delay?: number;
    // Details about how to play this effect
    effectInfo?: ProjectileMessage | AOEEffectMessage;
    // Instructions to execute after this effect is done
    instructions?: EffectInstruction[];
}

export interface MessageType {
    instructions: EffectInstruction[];
}
