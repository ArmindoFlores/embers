import { EffectBlueprint } from "./blueprint";

export type ReplicationType = "no" | "all" | "first_to_all";

export interface Spell {
    // The name of the effect to play
    name?: string;
    // Minimum number of targets
    minTargets?: number;
    // Maximum number of targets
    maxTargets?: number;
    // Thumbnail image to display for this effect
    thumbnail?: string;
    // Whether this effect should be repeated and how to do so
    replicate?: ReplicationType;

    // Blueprint for the effect to play
    blueprints?: EffectBlueprint[];
}

export interface Spells {
    [key: string]: Spell;
}
