import { BlueprintActionBuiltin, BlueprintActionDescription } from "../types/blueprint";
import OBR, { Vector2 } from "@owlbear-rodeo/sdk";

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

export const actions: Record<string, { action: BlueprintActionBuiltin, desc: BlueprintActionDescription }> = {
    move: {
        action: move,
        desc: {
            minArgs: 2,
            maxArgs: 2,
            description: "Move item with ID specified by the first argument to a position specified by the second argument",
            argumentType: "[string, vector]"
        }
    },
    show: {
        action: show,
        desc: {
            minArgs: 1,
            maxArgs: 1,
            description: "Set item with ID specified by the first argument to be visible",
            argumentType: "string"
        }
    },
    hide: {
        action: hide,
        desc: {
            minArgs: 1,
            maxArgs: 1,
            description: "Set item with ID specified by the first argument to be invisible",
            argumentType: "string"
        }
    }
};
