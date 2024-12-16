import { getEffect, getEffectURL, getVariantName, registerEffect, urlVariant } from "./effects";

import { AOEEffectInfo } from "../types/aoe";
import { buildImage } from "@owlbear-rodeo/sdk";
import { log_error } from "../logging";

export function aoe(aoeEffectInfo: AOEEffectInfo, worker: Worker, onComplete?: () => void, variant?: number) {
    const effect = getEffect(aoeEffectInfo.name);
    if (effect == undefined) {
        log_error(`Could not find effect "${aoeEffectInfo.name}"`);
        return;
    }
    
    const effectVariantName = getVariantName(aoeEffectInfo.name, 0);
    if (effectVariantName == undefined) {
        log_error(`Could not find adequate variant for effect "${aoeEffectInfo.name}"`);
        return;
    }
    const duration = effect.variants[effectVariantName].duration;
    const scale = { 
        x: 4, 
        y: 4
    };
    
    const url = getEffectURL(aoeEffectInfo.name, effectVariantName);
    if (url == undefined) {
        log_error(`Could not find URL for effect "${aoeEffectInfo.name}" (selected variant: ${effectVariantName})`);
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
        aoeEffectInfo.position
    ).disableHit(
        true
    ).locked(
        true
    ).build();

    // Add all items to the local scene
    registerEffect([image], worker, duration, onComplete);
}

