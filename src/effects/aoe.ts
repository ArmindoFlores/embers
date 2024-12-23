import { buildEffectImage, getEffect, getVariantName, registerEffect } from "./effects";

import { AOEEffectProperties } from "../types/aoe";
import { log_error } from "../logging";

export function aoe(aoeEffectProperties: AOEEffectProperties, worker: Worker, duration?: number, loops?: number, onComplete?: () => void, variant?: number, spellName?: string, spellCaster?: string) {
    const effect = getEffect(aoeEffectProperties.name);
    if (effect == undefined) {
        log_error(`Could not find effect "${aoeEffectProperties.name}"`);
        return;
    }
    const effectVariantName = getVariantName(aoeEffectProperties.name, aoeEffectProperties.size * effect.dpi);
        if (effectVariantName == undefined) {
            log_error(`Could not find adequate variant for effect "${aoeEffectProperties.name}"`);
            return undefined;
    }
    const result = buildEffectImage(
        aoeEffectProperties.name,
        effect,
        aoeEffectProperties.size,
        { x: 0.5, y: 0.5 },
        aoeEffectProperties.position,
        0,
        variant,
        undefined,
        aoeEffectProperties.disableHit,
        aoeEffectProperties.attachedTo,
        duration,
        loops,
        spellName,
        spellCaster
    );
    if (result == undefined) {
        return;
    }
    const { image, effectDuration } = result;

    // Add all items to the local scene
    registerEffect([image.build()], worker, effectDuration, onComplete, spellCaster);
}

