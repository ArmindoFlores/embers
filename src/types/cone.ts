import { Vector2 } from "@owlbear-rodeo/sdk";

export interface ConeMessage {
    source: Vector2;
    destination: Vector2;
}

export interface ConeInfo {
    name: string;
    source: Vector2;
    destination: Vector2;
    dpi: number;
}
