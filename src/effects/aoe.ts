import { effectMetadataKey, getEffect, getEffectURL, getVariantName, registerEffect, urlVariant } from "./effects";

import { AOEEffectProperties } from "../types/aoe";
import { buildImage } from "@owlbear-rodeo/sdk";
import { log_error } from "../logging";

export function aoe(aoeEffectProperties: AOEEffectProperties, worker: Worker, duration?: number, loops?: number, onComplete?: () => void, variant?: number) {
    const effect = getEffect(aoeEffectProperties.name);
    if (effect == undefined) {
        log_error(`Could not find effect "${aoeEffectProperties.name}"`);
        return;
    }
    
    const effectVariantName = getVariantName(aoeEffectProperties.name, 0);
    if (effectVariantName == undefined) {
        log_error(`Could not find adequate variant for effect "${aoeEffectProperties.name}"`);
        return;
    }
    const realDuration = duration ?? (loops != undefined ? loops * effect.variants[effectVariantName].duration : effect.variants[effectVariantName].duration);
    const scale = { 
        x: aoeEffectProperties.size, 
        y: aoeEffectProperties.size
    };
    
    const url = getEffectURL(aoeEffectProperties.name, effectVariantName);
    if (url == undefined) {
        log_error(`Could not find URL for effect "${aoeEffectProperties.name}" (selected variant: ${effectVariantName})`);
        return;
    }
    const DPI = effect.variants[effectVariantName].size[1];
    const image = buildImage(
        {
            width: effect.variants[effectVariantName].size[0],
            height: effect.variants[effectVariantName].size[1],
            url: urlVariant(url, variant),
            mime: "video/webm",
        },
        {
            dpi: DPI,
            offset: { x: DPI/2, y: DPI/2 }
        }
    ).scale(
        scale
    ).position(
        aoeEffectProperties.position
    ).disableHit(
        aoeEffectProperties.disableHit != undefined ? aoeEffectProperties.disableHit : realDuration >= 0
    ).locked(
        realDuration >= 0
    ).metadata(
        { [effectMetadataKey]: true }
    );
    if (aoeEffectProperties.attachedTo != undefined) {
        // Maybe change the item this attaches to's metadata
        // to enable a context menu?
        image.attachedTo(aoeEffectProperties.attachedTo);
    }

    // Add all items to the local scene
    registerEffect([image.build()], worker, realDuration, onComplete);
}

