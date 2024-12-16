import { Effect, Effects } from "../types/effects";
import OBR, { Image, Vector2 } from "@owlbear-rodeo/sdk";

import effectsJSON from "../effect_record.json";
import { log_info } from "../logging";

export const effects = effectsJSON as unknown as Effects;
export const effectNames = Object.keys(effectsJSON);

export function getEffect(name: string): Effect | undefined {
    return effects[name];
}

export function getEffectURL(effectName: string, variantName: string, variantIndex?: number) {
    // This function finds the appropriate effect and variant, and returns a URL to its video file
    const effect =  effects[effectName];
    if (effect == undefined) {
        return undefined;
    }
    const variant = effect.variants[variantName];
    if (variant == undefined) {
        return undefined;
    }
    const variantPath = variant.name[variantIndex ?? 0];
    if (variantPath == undefined) {
        return undefined;
    }

    return `${window.location.origin}/Library/${effect.basename}_${variantPath}.webm`;
}

export function urlVariant(url: string, variant?: number) {
    if (variant == undefined) {
        return url;
    }
    return `${url}?${variant}`;
}

export function getVariantName(effectName: string, distance: number) {
    // Given the name of an effect and the distance to the target, this function returns
    // the key of the variant whose resolution is best suited.
    const effect =  effects[effectName];
    if (effect == undefined) {
        return undefined;
    }
    const closest: { name: string|undefined, distance: number } = { name: undefined, distance: 0 };

    for (const key of Object.keys(effect.variants)) {
        const variantLength = parseInt(key);
        if (variantLength < 0 || isNaN(variantLength)) {
            continue;
        }
        const newDistance = Math.abs(distance - variantLength);
        if (closest.name == undefined || newDistance < closest.distance) {
            closest.name = key;
            closest.distance = newDistance;
        }
    }
    return closest.name;
}

export function getRotation(source: Vector2, destination: Vector2) {
    const deltaX = destination.x - source.x;
    const deltaY = destination.y - source.y;
    const angleRadians = Math.atan2(deltaY, deltaX);
    const angleDegrees = angleRadians * (180 / Math.PI);
    return angleDegrees;
}

export function getDistance(source: Vector2, destination: Vector2) {
    return Math.sqrt(Math.pow(source.x - destination.x, 2) + Math.pow(source.y - destination.y, 2));
}

export function registerEffect(images: Image[], worker: Worker, duration: number, onComplete?: () => void) {
    OBR.scene.local.addItems(images).then(() => {
        const id = images[0].id;

        // This worker will send a message to us with our ID, signaling us to delete
        // the item because enough time has passed.
        // We can't use setTimeout because, if the extension's window is not visible,
        // the browser will throttle us and we might let the animation play for far
        // too long.
        worker.addEventListener("message", message => {
            if (message.data == id) {
                log_info(`Deleting effect assets (from web worker)`);
                OBR.scene.local.deleteItems(images.map(image => image.id)).then(onComplete);
            }
        });
        worker.postMessage({ duration, id });
    });
}

export function prefetchAssets(assets: string[]) {
    const fetches = assets.map(async asset => {
        const response = await fetch(
            asset,
            { cache: "force-cache" }
        );
        await response.blob(); // Make sure all data is received
    });
    return Promise.all(fetches);
}
