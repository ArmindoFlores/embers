import { BaseEffectMessage, BaseEffectProperties } from "./effects";

import { Vector2 } from "@owlbear-rodeo/sdk";

export interface ProjectileMessage extends BaseEffectMessage {
    copies: number;
    source: Vector2;
    destination: Vector2;
}

export interface ProjectileProperties extends BaseEffectProperties {
    copies: number;
    source: Vector2;
    destination: Vector2;
}
