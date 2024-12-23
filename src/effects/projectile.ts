import { Image, buildImage } from "@owlbear-rodeo/sdk";
import { effectMetadataKey, getDistance, getEffect, getEffectURL, getRotation, getVariantName, registerEffect, urlVariant } from "./effects";

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

export function projectile(projectileInfo: ProjectileProperties, worker: Worker, duration?: number, loops?: number, onComplete?: () => void, variant?: number) {
    const effect = getEffect(projectileInfo.name);
    if (effect == undefined) {
        log_error(`Could not find effect "${projectileInfo.name}"`);
        return;
    }

    // We need to compute the distance and andle between the source and destination of the projectile
    // to choose an appropriate variant and to rotate and scale it properly.
    const distance = getDistance(projectileInfo.source, projectileInfo.destination);
    const rotation = getRotation(projectileInfo.source, projectileInfo.destination);
    const position = {
        x: projectileInfo.source.x,
        y: projectileInfo.source.y,
    };
    
    const effectVariantName = getVariantName(projectileInfo.name, distance / 30);
    if (effectVariantName == undefined) {
        log_error(`Could not find adequate variant for effect "${projectileInfo.name}"`);
        return;
    }
    const realDuration = duration ?? (loops != undefined ? loops * effect.variants[effectVariantName].duration : effect.variants[effectVariantName].duration);
    const DPI = effect.variants[effectVariantName].size[1];
    const scale = { 
        x: (distance / projectileInfo.dpi) / ((effect.variants[effectVariantName].size[0] - DPI) / DPI), 
        y: (distance / projectileInfo.dpi) / ((effect.variants[effectVariantName].size[0] - DPI) / DPI)
    };
    
    // For each copy, create a new Image object based on a variant of our chosen effect
    const images: Image[] = [];
    for (let i = 0; i < projectileInfo.copies; i++) {
        const url = getEffectURL(projectileInfo.name, effectVariantName, i % (effect.variants[effectVariantName].name.length));
        if (url == undefined) {
            log_error(`Could not find URL for effect "${projectileInfo.name}" (selected variant: ${effectVariantName})`);
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
                offset: { x: DPI/2, y: DPI/2 }
            }
        ).scale(
            scale
        ).rotation(
            rotation
        ).position(
            position
        ).disableHit(
            projectileInfo.disableHit != undefined ? projectileInfo.disableHit : realDuration >= 0
        ).locked(
            realDuration >= 0
        ).metadata(
            { [effectMetadataKey]: true }
        );
        if (projectileInfo.attachedTo != undefined) {
            image.attachedTo(projectileInfo.attachedTo);
        }
        images.push(image.build());
    }

    // Add all items to the local scene
    registerEffect(images, worker, realDuration, onComplete);
}

