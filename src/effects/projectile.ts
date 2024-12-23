import { buildEffectImage, getDistance, getEffect, getEffectURL, getRotation, getVariantName, registerEffect, urlVariant } from "./effects";

import { Image } from "@owlbear-rodeo/sdk";
import { ProjectileProperties } from "../types/projectile";
import { log_error } from "../logging";

export function precomputeProjectileAssets(projectileInfo: ProjectileProperties, variant?: number) {
    const assets: string[] = [];

    const effect = getEffect(projectileInfo.name);
    if (effect == undefined) {
        log_error(`Could not find effect "${projectileInfo.name}"`);
        return assets;
    }

    const distance = getDistance(projectileInfo.source, projectileInfo.destination);
    
    const effectVariantName = getVariantName(projectileInfo.name, distance / 30);
    if (effectVariantName == undefined) {
        log_error(`Could not find adequate variant for effect "${projectileInfo.name}"`);
        return assets;
    }
    
    for (let i = 0; i < projectileInfo.copies; i++) {
        const url = getEffectURL(projectileInfo.name, effectVariantName, i % (effect.variants[effectVariantName].name.length));
        if (url == undefined) {
            log_error(`Could not find URL for effect "${projectileInfo.name}" (selected variant: ${effectVariantName})`);
            continue;
        }
        assets.push(urlVariant(url, variant));
    }

    return assets;
}

export function projectile(projectileInfo: ProjectileProperties, worker: Worker, duration?: number, loops?: number, onComplete?: () => void, variant?: number, spellName?: string) {
    const effect = getEffect(projectileInfo.name);
    if (effect == undefined) {
        log_error(`Could not find effect "${projectileInfo.name}"`);
        return;
    }

    // We need to compute the distance and andle between the source and destination of the projectile
    // to choose an appropriate variant and to rotate and scale it properly.
    const distance = getDistance(projectileInfo.source, projectileInfo.destination) / projectileInfo.dpi;
    const rotation = getRotation(projectileInfo.source, projectileInfo.destination);
    const position = {
        x: projectileInfo.source.x,
        y: projectileInfo.source.y,
    };
    
    // For each copy, create a new Image object based on a variant of our chosen effect
    let realDuration = 0;
    const images: Image[] = [];
    for (let i = 0; i < projectileInfo.copies; i++) {
        const result = buildEffectImage(
            projectileInfo.name,
            effect,
            distance,
            { x: 0.5, y: 0.5 },
            position,
            rotation,
            variant,
            i,
            projectileInfo.disableHit,
            projectileInfo.attachedTo,
            duration,
            loops,
            spellName
        );
        if (result == undefined) {
            return;
        }
        const { image, effectDuration } = result;
        realDuration = effectDuration;
        images.push(image.build());
    }

    // Add all items to the local scene
    registerEffect(images, worker, realDuration, onComplete);
}

