import { Vector2, buildImage } from "@owlbear-rodeo/sdk";
import { getEffect, getEffectURL, getVariantName, registerEffect, urlVariant } from "./effects";

import { ConeProperties } from "../types/cone";
import { log_error } from "../logging";

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

export function cone(coneInfo: ConeProperties, worker: Worker, duration?: number, loops?: number, onComplete?: () => void, variant?: number) {
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
    const realDuration = duration ?? (loops != undefined ? loops * effect.variants[effectVariantName].duration : effect.variants[effectVariantName].duration);
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
            url: urlVariant(url, variant),
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
        realDuration >= 0
    ).locked(
        realDuration >= 0
    ).build();

    // Add all items to the local scene
    registerEffect([image], worker, realDuration, onComplete);
}

