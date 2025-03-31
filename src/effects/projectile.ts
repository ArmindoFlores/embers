import { Image, Layer, Metadata, Vector2 } from "@owlbear-rodeo/sdk";
import { buildEffectImage, getDistance, getEffect, getEffectURL, getRotation, getVariantName, registerEffect, spellMetadataKey, urlVariant } from "./effects";

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

export function getProjectilePose(source: Vector2, destination: Vector2, dpi: number) {
    const distance = getDistance(source, destination) / dpi;
    const rotation = getRotation(source, destination);
    const position = {
        x: source.x,
        y: source.y,
    };
    return { distance, rotation, position };
}

export function projectile(
    projectileInfo: ProjectileProperties,
    duration?: number,
    loops?: number,
    metadata?: Metadata,
    layer?: Layer,
    zIndex?: number,
    onComplete?: () => void,
    variant?: number,
    spellName?: string,
    spellCaster?: string
) {
    const effect = getEffect(projectileInfo.name);
    if (effect == undefined) {
        log_error(`Could not find effect "${projectileInfo.name}"`);
        return;
    }

    // We need to compute the distance and angle between the source and destination of the projectile
    // to choose an appropriate variant and to rotate and scale it properly.
    const { distance, rotation, position } = getProjectilePose(
        projectileInfo.source,
        projectileInfo.destination,
        projectileInfo.dpi
    );

    // For each copy, create a new Image object based on a variant of our chosen effect
    let realDuration = 0;
    const images: Image[] = [];
    for (let i = 0; i < projectileInfo.copies; i++) {
        const result = buildEffectImage(
            projectileInfo.name,
            effect,
            distance,
            effect.type === "TARGET" ? { x: 0.5, y: 0.5 } : { x: 0, y: 0.5 },
            position,
            rotation,
            variant,
            i,
            projectileInfo.disableHit,
            projectileInfo.attachedTo,
            duration,
            loops,
            metadata,
            layer,
            zIndex,
            spellName,
            spellCaster
        );
        if (result == undefined) {
            return;
        }
        const { image, effectDuration } = result;
        if (realDuration == -1 || effectDuration == -1) {
            realDuration = -1;
        }
        else {
            realDuration = Math.max(realDuration, effectDuration);
        }
        // FIXME: do this another way
        const builtImage = image.build();
        if (projectileInfo.sourceId || projectileInfo.destinationId) {
            builtImage.metadata[spellMetadataKey] = { ...builtImage.metadata[spellMetadataKey] ?? {}, sourceId: projectileInfo.sourceId, destinationId: projectileInfo.destinationId };
        }
        images.push(builtImage);
    }

    // Add all items to the local scene
    registerEffect(images, realDuration, onComplete, spellCaster);
}
