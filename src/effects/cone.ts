import { buildEffectImage, getEffect, registerEffect } from "./effects";

import { ConeProperties } from "../types/cone";
import { Vector2 } from "@owlbear-rodeo/sdk";
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

export function cone(coneInfo: ConeProperties, worker: Worker, duration?: number, loops?: number, onComplete?: () => void, variant?: number, spellName?: string, spellCaster?: string) {
    const effect = getEffect(coneInfo.name);
    if (effect == undefined) {
        log_error(`Could not find effect "${coneInfo.name}"`);
        return;
    }

    // We need to compute the distance and andle between the source and destination of the cone
    // to choose an appropriate variant and to rotate and scale it properly.
    const distance = getDistance(coneInfo.source, coneInfo.destination) / coneInfo.dpi;
    const rotation = getRotation(coneInfo.source, coneInfo.destination);
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
        spellName
    );
    if (result == undefined) {
        return;
    }
    const { image, effectDuration } = result;

    // Add all items to the local scene
    registerEffect([image.build()], worker, effectDuration, onComplete, spellCaster);
}

