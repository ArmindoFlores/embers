import OBR, { Vector2, buildImage } from "@owlbear-rodeo/sdk";
import { getEffect, getEffectURL, getVariantName } from "./effects";
import { log_error, log_info } from "../logging";

import { ConeInfo } from "../types/cone";

function getRotation(source: Vector2, destination: Vector2) {
    const deltaX = destination.x - source.x;
    const deltaY = destination.y - source.y;
    const angleRadians = Math.atan2(deltaY, deltaX);
    const angleDegrees = angleRadians * (180 / Math.PI);
    return angleDegrees;
}

function getDistance(source: Vector2, destination: Vector2) {
    return Math.sqrt(Math.pow(source.x - destination.x, 2) + Math.pow(source.y - destination.y, 2));
}

export function cone(coneInfo: ConeInfo, worker: Worker, onComplete?: () => void, variant?: number) {
    const effect = getEffect(coneInfo.name);
    if (effect == undefined) {
        log_error(`Could not find effect "${coneInfo.name}"`);
        return;
    }

    // We need to compute the distance and andle between the source and destination of the cone
    // to choose an appropriate variant and to rotate and scale it properly.
    const distance = getDistance(coneInfo.source, coneInfo.destination);
    const rotation = getRotation(coneInfo.source, coneInfo.destination);
    const position = {
        x: coneInfo.source.x,
        y: coneInfo.source.y,
    };
    
    const effectVariantName = getVariantName(coneInfo.name, distance / 30);
    if (effectVariantName == undefined) {
        log_error(`Could not find adequate variant for effect "${coneInfo.name}"`);
        return;
    }
    const duration = effect.variants[effectVariantName].duration;
    const DPI = effect.variants[effectVariantName].size[1];
    const scale = { 
        x: (distance / coneInfo.dpi) / ((effect.variants[effectVariantName].size[0]) / DPI), 
        y: (distance / coneInfo.dpi) / ((effect.variants[effectVariantName].size[0]) / DPI)
    };
    
    const url = getEffectURL(coneInfo.name, effectVariantName);
    if (url == undefined) {
        log_error(`Could not find URL for effect "${coneInfo.name}" (selected variant: ${effectVariantName})`);
        return;
    }
    const image = buildImage(
        {
            width: effect.variants[effectVariantName].size[0],
            height: effect.variants[effectVariantName].size[1],
            url: `${url}?${variant ?? ""}`,
            mime: "video/webm",

        },
        {
            dpi: DPI,
            offset: { x: 0, y: DPI/2 }
        }
    ).scale(
        scale
    ).rotation(
        rotation
    ).position(
        position
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
                log_info(`Deleting cone (from web worker)`);
                OBR.scene.local.deleteItems([image.id]).then(onComplete);
            }
        });
        worker.postMessage({ duration, id });
    });
}

