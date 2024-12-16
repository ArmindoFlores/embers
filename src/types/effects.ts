export type EffectType = "CIRCLE" | "CONE" | "TARGET";

export interface EffectVariant {
    name: string[];
    duration: number;
    size: [number, number];
}

export interface Effect {
    basename: string;
    type: EffectType;
    variants: {
        [key: string]: EffectVariant;
    }
}

export interface Effects {
    [key: string]: Effect;
}
