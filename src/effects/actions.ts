import { BlueprintActionBuiltin, BlueprintActionDescription } from "../types/blueprint";
import OBR, { ImageDownload, Vector2, buildImage } from "@owlbear-rodeo/sdk";

import { log_error } from "../logging";

function move(itemID: string, position: Vector2) {
    OBR.scene.items.updateItems([itemID], items => {
        for (const item of items) {
            item.position = position;
        }
    });
}

function hide(itemID: string) {
    OBR.scene.items.updateItems([itemID], items => {
        for (const item of items) {
            item.visible = false;
        }
    });
}

function show(itemID: string) {
    OBR.scene.items.updateItems([itemID], items => {
        for (const item of items) {
            item.visible = true;
        }
    });
}

function create_token(image: ImageDownload, position: Vector2, local = false) {
    const imageObj = image;
    let imageItem = buildImage(imageObj.image, imageObj.grid)
        .name(imageObj.name)
        .position(position)
        .rotation(imageObj.rotation)
        .scale(imageObj.scale)
        .text(imageObj.text)
        .textItemType(imageObj.textItemType)
        .visible(imageObj.visible)
        .locked(imageObj.locked)
        .layer(imageObj.type);

    if (imageObj.description) {
        imageItem = imageItem.description(imageObj.description);
    }
    if (local) {
        OBR.scene.local.addItems([imageItem.build()]);
    }
    else {
        OBR.scene.items.addItems([imageItem.build()]);
    }
}

function message(channel: string, data: unknown, destination: "REMOTE" | "LOCAL" | "ALL" = "ALL") {
    OBR.broadcast.sendMessage(channel, data, { destination });
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
function actionWrapper(actionFunc: Function) {
    function wrapper(...args: unknown[]) {
        try {
            return actionFunc(...args);
        }
        catch (e) {
            const error = e as Error;
            log_error(`Action "${actionFunc.name}": ${error.message}`);
        }
    }
    return wrapper as BlueprintActionBuiltin;
}

export const actions: Record<string, { action: BlueprintActionBuiltin, desc: BlueprintActionDescription }> = {
    create_token: {
        action: actionWrapper(create_token),
        desc: {
            minArgs: 2,
            maxArgs: 3,
            description: "Add token described by the first argument to the scene at position specified by the second argument; if the third arument argument is true, then it will be added to the local items",
            argumentType: "[asset, vector, boolean]"
        }
    },
    move: {
        action: actionWrapper(move),
        desc: {
            minArgs: 2,
            maxArgs: 2,
            description: "Move item with ID specified by the first argument to a position specified by the second argument",
            argumentType: "[string, vector]"
        }
    },
    show: {
        action: actionWrapper(show),
        desc: {
            minArgs: 1,
            maxArgs: 1,
            description: "Set item with ID specified by the first argument to be visible",
            argumentType: "string"
        }
    },
    hide: {
        action: actionWrapper(hide),
        desc: {
            minArgs: 1,
            maxArgs: 1,
            description: "Set item with ID specified by the first argument to be invisible",
            argumentType: "string"
        }
    },
    message: {
        action: actionWrapper(message),
        desc: {
            minArgs: 2,
            maxArgs: 3,
            description: "Send a message using the OBR SDK; the first argument is channel ID, the second is the data, and the last (optional) is the destination, which can be \"REMOTE\" (to send to all other players), \"LOCAL\" (to send to the current player only), or \"ALL\" (to send to every player); the default is \"ALL\""
        }
    }
};
