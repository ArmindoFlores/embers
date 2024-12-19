import { Effect, Effects } from "../types/effects";
import OBR, { Image, Vector2 } from "@owlbear-rodeo/sdk";
import { getSortedTargets, getTargetCount } from "../targetTool";
import { log_error, log_info } from "../logging";

import { MESSAGE_CHANNEL } from "../components/MessageListener";
import effectsJSON from "../effect_record.json";

export const effects = effectsJSON as unknown as Effects;
export const effectNames = Object.entries(effects).flatMap(([key1, innerObject]) => Object.keys(innerObject).map(key2 => key2 != "$" ? `${key1}.${key2}` : key1));

function getKeysFromEffectName(name: string) {
    const [effect, subeffect] = name.split(".");
    return [effect, subeffect ?? "$"];
}

export function getEffect(name: string): Effect | undefined {
    const [effect, subeffect] = getKeysFromEffectName(name);
    return effects[effect][subeffect];
}

export function getEffectURL(name: string, variantName: string, variantIndex?: number) {
    // This function finds the appropriate effect and variant, and returns a URL to its video file
    const [effectName, subeffectName] = getKeysFromEffectName(name);
    const effect =  effects[effectName][subeffectName];
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
    const effect =  getEffect(effectName);
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

export function doEffect(effectName: string, effect?: Effect) {
    if (effect == undefined) {
        effect = getEffect(effectName);
    }
    if (effect == undefined) {
        log_error(`Unknown effect "${effectName}"`);
        return;
    }
    getSortedTargets().then(targets => {               
        OBR.scene.local.deleteItems(targets.map(item => item.id));

        if (effect.type === "TARGET") {
            if (targets.length < 2) {
                OBR.notification.show(`Magic Missiles: The effect "${effectName}" requires at least 2 targets`, "ERROR");
                return;
            }

            OBR.broadcast.sendMessage(
                MESSAGE_CHANNEL, 
                {
                    instructions: targets.slice(1).map(target => ({
                        effectId: effectName,
                        effectInfo: {
                            copies: getTargetCount(target),
                            source: targets[0].position,
                            destination: target.position
                        }
                    }))
                },
                { destination: "ALL" }
            );
        }
        else if (effect.type === "CIRCLE") {
            if (targets.length < 1) {
                OBR.notification.show(`Magic Missiles: The effect "${effectName}" requires at least 1 target`, "ERROR");
                return;
            }

            OBR.broadcast.sendMessage(
                MESSAGE_CHANNEL, 
                {
                    instructions: targets.map(target => ({
                        effectId: effectName,
                        effectInfo: {
                            position: target.position
                        }
                    }))
                },
                { destination: "ALL" }
            );
        }
        else if (effect.type === "CONE") {
            if (targets.length != 2) {
                OBR.notification.show(`Magic Missiles: The effect "${effectName}" requires exactly 2 targets`, "ERROR");
                return;
            }
            
            OBR.broadcast.sendMessage(
                MESSAGE_CHANNEL, 
                {
                    instructions: [{
                        effectId: effectName,
                        effectInfo: {
                            source: targets[0].position,
                            destination: targets[1].position
                        }
                    }]
                },
                { destination: "ALL" }
            );
        }
    });
}
