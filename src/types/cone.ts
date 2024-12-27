import { BaseEffectMessage, BaseEffectProperties } from "./effects";

import { Vector2 } from "@owlbear-rodeo/sdk";

export interface ConeMessage extends BaseEffectMessage {
    source: Vector2;
    rotation: number;
    size: number;
}

export interface ConeProperties extends BaseEffectProperties {
    source: Vector2;
    rotation: number;
    size: number;
}
