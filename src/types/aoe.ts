import { Vector2 } from "@owlbear-rodeo/sdk";

export interface AOEEffectMessage {
    position: Vector2;
}

export interface AOEEffectInfo {
    name: string;
    position: Vector2;
    dpi: number;
}
