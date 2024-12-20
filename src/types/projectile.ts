import { Vector2 } from "@owlbear-rodeo/sdk";

export interface ProjectileMessage {
    copies: number;
    source: Vector2;
    destination: Vector2;
}

export interface ProjectileProperties {
    name: string;
    copies: number;
    source: Vector2;
    destination: Vector2;
    dpi: number;
}
