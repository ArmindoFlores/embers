import { Vector2 } from "@owlbear-rodeo/sdk";

export interface AOEEffectMessage {
    position: Vector2;
    size: number;
}

export interface AOEEffectProperties {
    name: string;
    position: Vector2;
    size: number;
    dpi: number;
}
