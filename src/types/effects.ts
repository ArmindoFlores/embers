export type EffectType = "CIRCLE" | "CONE" | "TARGET";

export interface EffectVariant {
    name: string[];
    duration: number;
    size: [number, number];
}

export interface Effect {
    basename: string;
    type: EffectType;
    thumbnail: string;
    variants: {
        [key: string]: EffectVariant;
    }
}

export interface Effects {
    [key: string]: {
        [key: string]: Effect;
    };
}
