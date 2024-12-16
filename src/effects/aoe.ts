import OBR, { buildImage } from "@owlbear-rodeo/sdk";
import { getEffect, getEffectURL, getVariantName } from "./effects";
import { log_error, log_info } from "../logging";

import { AOEEffectInfo } from "../types/aoe";

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
            url: `${url}?${variant}`,
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
    OBR.scene.local.addItems([image]).then(() => {
        const id = image.id;

        // This worker will send a message to us with our ID, signaling us to delete
        // the item because enough time has passed.
        // We can't use setTimeout because, if the extension's window is not visible,
        // the browser will throttle us and we might let the animation play for far
        // too long.
        worker.addEventListener("message", message => {
            if (message.data == id) {
                log_info(`Deleting aoe effect (from web worker)`);
                OBR.scene.local.deleteItems([image.id]).then(onComplete);
            }
        });
        worker.postMessage({ duration, id });
    });
}

