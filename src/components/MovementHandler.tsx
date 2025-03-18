import OBR, { Image, Item, Vector2 } from "@owlbear-rodeo/sdk";
import { effectMetadataKey, getEffect, getEffectURL, getVariantName, spellMetadataKey } from "../effects/effects";
import { useEffect, useRef, useState } from "react";

import { APP_KEY } from "../config";
import { getProjectilePose } from "../effects/projectile";
import { log_error } from "../logging";
import { useOBR } from "../react-obr/providers";

export const trackedMovementMetadataKey = `${APP_KEY}/tracked-movement`;

function vectorEquals(v1: Vector2, v2: Vector2) {
    return v1.x === v2.x && v1.y === v2.y;
}

function moveEffect(effectItemId: string, items: Item[], dpi: number) {
    const effectItem = items.find(item => item.id === effectItemId) as Image;
    if (effectItem == undefined) {
        // Effect is gone
        return;
    }
    const effectId = effectItem.metadata[effectMetadataKey] as string|undefined;
    const spellInfo = effectItem.metadata[spellMetadataKey] as { sourceId?: string, destinationId?: string };
    if (spellInfo == undefined || effectId == undefined) {
        // Spell doesn't contain required information
        return;
    }
    const effect = getEffect(effectId);
    if (effect == undefined) {
        log_error(`Invalid effect ID '${effectId}'`);
        return;
    }
    const source = items.find(item => item.id === spellInfo.sourceId);
    const destination = items.find(item => item.id === spellInfo.destinationId);
    if (source == undefined && destination == undefined) {
        // No need to move this
        return;
    }

    // TODO: What about undefined source/destination?
    const { position, rotation, distance } = getProjectilePose(
        source!.position!,
        destination!.position!,
        dpi
    );
    const variantName = getVariantName(effectId, distance * effect.dpi);
    const variantSize = variantName ? parseInt(variantName) : undefined;
    if (variantName == undefined || variantSize == undefined) {
        log_error(`Invalid variant size '${variantName}'`);
        return;
    }
    const effectURL = getEffectURL(effectId, variantName);
    if (effectURL == undefined) {
        log_error("Error moving projectile effect");
        return;
    }
    const scale = distance / (variantSize / effect.dpi);

    OBR.scene.items.updateItems([effectItem], effectItems => {
        for (const effectItem of effectItems) {
            effectItem.scale = { x: scale, y: scale };
            effectItem.position = position;
            effectItem.rotation = rotation;
            effectItem.image.url = effectURL;
            effectItem.image.width = effect.variants[variantName].size[0];
            effectItem.image.height = effect.variants[variantName].size[1];
            effectItem.grid.offset = {
                x: effect.variants[variantName].size[1] * 0.5,
                y: effect.variants[variantName].size[1] * 0.5
            };
        }
    });
}

export default function MovementHandler() {
    const obr = useOBR();
    const itemsToTrack = useRef<Map<string, { previousPosition: Vector2, effectIds: string[] }>>(new Map());
    const [dpi, setDpi] = useState(400);

    useEffect(() => {
        if (!obr.ready || !obr.sceneReady) {
            return;
        }
        OBR.scene.grid.getDpi().then(dpi => setDpi(dpi));
        return OBR.scene.grid.onChange(grid => setDpi(grid.dpi));
    }, [obr.ready, obr.sceneReady]);

    useEffect(() => {
        if (!obr.ready || !obr.sceneReady) {
            return;
        }

        return OBR.scene.items.onChange(items => {
            for (const item of items) {
                const trackedItem = itemsToTrack.current.get(item.id);
                if (trackedItem != undefined && !vectorEquals(trackedItem.previousPosition, item.position)) {
                    for (const effectId of trackedItem.effectIds) {
                        moveEffect(effectId, items, dpi);
                    }
                }
            }
            itemsToTrack.current.clear();
            for (const item of items) {
                if (item.metadata[spellMetadataKey] != undefined) {
                    const spellInfo = item.metadata[spellMetadataKey] as { sourceId?: string, destinationId?: string };
                    if (spellInfo.sourceId) {
                        const itemToTrack = items.find(tracked => tracked.id === spellInfo.sourceId);
                        if (itemToTrack != undefined) {
                            itemsToTrack.current.set(
                                itemToTrack.id,
                                {
                                    previousPosition: itemToTrack.position,
                                    effectIds: [...itemsToTrack.current.get(itemToTrack.id)?.effectIds ?? [], item.id]
                                }
                            );
                        }
                    }
                    if (spellInfo.destinationId) {
                        const itemToTrack = items.find(tracked => tracked.id === spellInfo.destinationId);
                        if (itemToTrack != undefined) {
                            itemsToTrack.current.set(
                                itemToTrack.id,
                                {
                                    previousPosition: itemToTrack.position,
                                    effectIds: [...itemsToTrack.current.get(itemToTrack.id)?.effectIds ?? [], item.id]
                                }
                            );
                        }
                    }
                }
            }
        });
    }, [obr.ready, obr.sceneReady, dpi]);

    return null;
}
