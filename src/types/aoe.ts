import { Vector2 } from "@owlbear-rodeo/sdk";

export interface AOEEffectMessage {
    position: Vector2;
    size: number;
}

export interface AOEEffectInfo {
    name: string;
    position: Vector2;
    size: number;
    dpi: number;
}
