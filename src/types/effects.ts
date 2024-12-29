export type EffectType = "CIRCLE" | "CONE" | "TARGET" | "WALL";

export interface EffectVariant {
    name: string[];
    duration: number;
    size: [number, number];
}

export interface Effect {
    basename: string;
    type: EffectType;
    thumbnail: string;
    dpi: number;
    variants: {
        [key: string]: EffectVariant;
    }
}

export interface Effects {
    [key: string]: Effects | Effect;
}

export interface BaseEffectMessage {
    disableHit?: boolean;
    attachedTo?: string;
}

export interface BaseEffectProperties {
    name: string;
    dpi: number;
    disableHit?: boolean;
    attachedTo?: string;
}
