import { Effect, Effects } from "../types/effects";

import effectsJSON from "../effect_record.json";

export const effects = effectsJSON as unknown as Effects;
export const effectNames = Object.keys(effectsJSON);

export function getEffect(name: string): Effect | undefined {
    return effects[name];
}

export function getEffectURL(effectName: string, variantName: string, variantIndex?: number) {
    // This function finds the appropriate effect and variant, and returns a URL to its video file
    const effect =  effects[effectName];
    if (effect == undefined) {
        return undefined;
    }
    const variant = effect.variants[variantName];
    if (variant == undefined) {
        return undefined;
    }
    const variantPath = variant.name[variantIndex ?? 0];
    if (variantPath == undefined) {
        return undefined;
    }

    return `${window.location.origin}/Library/${effect.basename}_${variantPath}.webm`;
}

export function getVariantName(effectName: string, distance: number) {
    // Given the name of an effect and the distance to the target, this function returns
    // the key of the variant whose resolution is best suited.
    const effect =  effects[effectName];
    if (effect == undefined) {
        return undefined;
    }
    const closest: { name: string|undefined, distance: number } = { name: undefined, distance: 0 };

    for (const key of Object.keys(effect.variants)) {
        const variantLength = parseInt(key);
        if (variantLength < 0 || isNaN(variantLength)) {
            continue;
        }
        const newDistance = Math.abs(distance - variantLength);
        if (closest.name == undefined || newDistance < closest.distance) {
            closest.name = key;
            closest.distance = newDistance;
        }
    }
    return closest.name;
}