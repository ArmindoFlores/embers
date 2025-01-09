import { BaseEffectMessage, BaseEffectProperties } from "./effects";

import { Vector2 } from "@owlbear-rodeo/sdk";

export interface AOEEffectMessage extends BaseEffectMessage {
    source: Vector2;
    size: number;
    rotation?: number;
}

export interface AOEEffectProperties extends BaseEffectProperties {
    source: Vector2;
    size: number;
    rotation?: number;
}
