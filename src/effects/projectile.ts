import OBR, { Image, Vector2, buildImage } from "@owlbear-rodeo/sdk";
import { getEffect, getEffectURL, getVariantName } from "./effects";
import { log_error, log_info } from "../logging";

import { ProjectileInfo } from "../types/projectile";

function getProjectileRotation(source: Vector2, destination: Vector2) {
    const deltaX = destination.x - source.x;
    const deltaY = destination.y - source.y;
    const angleRadians = Math.atan2(deltaY, deltaX);
    const angleDegrees = angleRadians * (180 / Math.PI);
    return angleDegrees;
}

function getProjectileDistance(source: Vector2, destination: Vector2) {
    return Math.sqrt(Math.pow(source.x - destination.x, 2) + Math.pow(source.y - destination.y, 2));
}

export function projectile(projectileInfo: ProjectileInfo, worker: Worker, onComplete?: () => void, variant?: number) {
    const effect = getEffect(projectileInfo.name);
    if (effect == undefined) {
        log_error(`Could not find effect "${projectileInfo.name}"`);
        return;
    }

    // We need to compute the distance and andle between the source and destination of the projectile
    // to choose an appropriate variant and to rotate and scale it properly.
    const distance = getProjectileDistance(projectileInfo.source, projectileInfo.destination);
    const rotation = getProjectileRotation(projectileInfo.source, projectileInfo.destination);
    const position = {
        x: projectileInfo.source.x,
        y: projectileInfo.source.y,
    };
    
    const effectVariantName = getVariantName(projectileInfo.name, distance / 30);
    if (effectVariantName == undefined) {
        log_error(`Could not find adequate variant for effect "${projectileInfo.name}"`);
        return;
    }
    const duration = effect.variants[effectVariantName].duration;
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
                url: `${url}?${variant ?? ""}`,
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
            true
        ).locked(
            true
        ).build();
        images.push(image);
    }

    // Add all items to the local scene
    OBR.scene.local.addItems(images).then(() => {
        const id = images[0].id;

        // This worker will send a message to us with our ID, signaling us to delete
        // the item because enough time has passed.
        // We can't use setTimeout because, if the extension's window is not visible,
        // the browser will throttle us and we might let the animation play for far
        // too long.
        worker.addEventListener("message", message => {
            if (message.data == id) {
                log_info(`Deleting projectiles (from web worker)`);
                OBR.scene.local.deleteItems(images.map(image => image.id)).then(onComplete);
            }
        });
        worker.postMessage({ duration, id });
    });
}

