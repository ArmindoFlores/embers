import { Layer, Metadata } from "@owlbear-rodeo/sdk";
import { buildEffectImage, getEffect, registerEffect } from "./effects";

import { ConeProperties } from "../types/cone";
import { log_error } from "../logging";

export function cone(
    coneInfo: ConeProperties,
    worker: Worker,
    duration?: number,
    loops?: number,
    metadata?: Metadata,
    layer?: Layer,
    onComplete?: () => void,
    variant?: number,
    spellName?: string,
    spellCaster?: string
) {
    const effect = getEffect(coneInfo.name);
    if (effect == undefined) {
        log_error(`Could not find effect "${coneInfo.name}"`);
        return;
    }

    // We need to compute the distance and andle between the source and destination of the cone
    // to choose an appropriate variant and to rotate and scale it properly.
    const distance = coneInfo.size;
    const rotation = coneInfo.rotation;
    const position = {
        x: coneInfo.source.x,
        y: coneInfo.source.y,
    };

    const result = buildEffectImage(
        coneInfo.name,
        effect,
        distance,
        { x: 0, y: 0.5 },
        position,
        rotation,
        variant,
        undefined,
        coneInfo.disableHit,
        coneInfo.attachedTo,
        duration,
        loops,
        metadata,
        layer,
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
