import { EffectBlueprint } from "./blueprint";

export type ReplicationType = "no" | "all" | "first_to_all";
export type ParameterType = "options" | "number" | "boolean" | "asset";

export type OptionsContent = {
    value: string;
    label: string;
}[];

export interface NumberContent {
    min?: number;
    max?: number;
}

export type BooleanContent = undefined;

export interface Parameter {
    name: string;
    id: string;
    type: ParameterType;
    defaultValue: unknown;
    content?: OptionsContent | NumberContent | BooleanContent;
}

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
    // Whether this effect should be copied when targetting the same item multiple times and how to do so
    copy?: number;

    // List of parameters for this spell
    parameters?: Parameter[];

    // Blueprint for the effect to play
    blueprints?: EffectBlueprint[];

    // Blueprint for the effect to play when it is destroyed
    onDestroyBlueprints?: EffectBlueprint[];
}

export interface Spells {
    [key: string]: Spell;
}
