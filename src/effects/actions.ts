import OBR, { Vector2 } from "@owlbear-rodeo/sdk";

import { BlueprintFunctionBuiltin } from "../types/blueprint";

function move(itemID: unknown, position: unknown) {
    OBR.scene.items.updateItems([itemID as string], items => {
        for (const item of items) {
            item.position = position as Vector2;
        }
    });
}

function hide(itemID: unknown) {
    OBR.scene.items.updateItems([itemID as string], items => {
        for (const item of items) {
            item.visible = false;
        }
    });
}

function show(itemID: unknown) {
    OBR.scene.items.updateItems([itemID as string], items => {
        for (const item of items) {
            item.visible = true;
        }
    });
}

export const actions: Record<string, BlueprintFunctionBuiltin> = {
    move,
    show,
    hide
};
