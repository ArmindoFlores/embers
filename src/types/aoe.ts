import { BaseEffectMessage, BaseEffectProperties } from "./effects";

import { Vector2 } from "@owlbear-rodeo/sdk";

export interface AOEEffectMessage extends BaseEffectMessage {
    position: Vector2;
    size: number;
}

export interface AOEEffectProperties extends BaseEffectProperties {
    position: Vector2;
    size: number;
}
