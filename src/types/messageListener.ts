import { AOEEffectMessage } from "./aoe";
import { ConeMessage } from "./cone";
import { ProjectileMessage } from "./projectile";

export interface EffectInstruction {
    // The name of the effect to play
    id?: string;
    // Time to wait before starting this effect
    delay?: number;
    // Details about how to play this effect
    effectProperties?: ProjectileMessage | AOEEffectMessage | ConeMessage;
    // Instructions to execute after this effect is done
    instructions?: EffectInstruction[];
}

export interface MessageType {
    instructions: EffectInstruction[];
}
