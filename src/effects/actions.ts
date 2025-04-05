import { BlueprintActionBuiltin, BlueprintActionDescription } from "../types/blueprint";
import { EasingFunction, getEasingFunction, setDifference } from "../utils";
import OBR, { Image, Item, Vector2, buildImage, isImage } from "@owlbear-rodeo/sdk";
import { log_error, log_warn } from "../logging";

import { Interaction } from "../components/MessageListener";
import { SimplifiedItem } from "../types/misc";
import { WritableDraft } from "immer";

async function updateItems(items: string[], update: (draft: WritableDraft<Item>[]) => void, interaction: Interaction|undefined, localOnly: boolean) {
    const localItems = items.map(item => `embers-copy-${item}`);

    if (interaction) {
        const [interactionUpdate] = interaction.manager;
        interactionUpdate(items => {
            update(items.filter(item => localItems.includes(item.id.toString())));
        });
    }

    const itemsToUpdateGlobally = Array.from((localOnly ? new Set<string>() : setDifference(new Set(items), new Set(interaction?.trackedIDs ?? []))).values());
    if (itemsToUpdateGlobally.length) {
        OBR.scene.items.updateItems(itemsToUpdateGlobally, update);
    }
}

async function getItems(items: string[], interaction: Interaction|undefined) {
    const localItems = items.map(item => `embers-copy-${item}`);
    const difference: Set<string> = new Set(items);
    let itemStates: Image[] = [];

    if (interaction) {
        itemStates = interaction.getLastKnownState(localItems);
        for (const item of itemStates) {
            difference.delete(item.id.replace("embers-copy-", ""));
        }
    }
    const differenceArray = Array.from(difference.values());
    if (differenceArray.length > 0) {
        return [...itemStates, ...await OBR.scene.items.getItems(items)];
    }
    return itemStates;
}

function move(interaction: Interaction|undefined, localOnly: boolean, itemID: string, position: Vector2) {
    updateItems([itemID], items => {
        for (const item of items) {
            item.position = position;
        }
    }, interaction, localOnly);
}

function hide(interaction: Interaction|undefined, localOnly: boolean, itemID: string) {
    updateItems([itemID], items => {
        for (const item of items) {
            item.visible = false;
        }
    }, interaction, localOnly);
}

function show(interaction: Interaction|undefined, localOnly: boolean, itemID: string) {
    updateItems([itemID], items => {
        for (const item of items) {
            item.visible = true;
        }
    }, interaction, localOnly);
}

async function aslide(interaction: Interaction|undefined, itemID: string, position: Vector2, duration: number, easingFunction: EasingFunction) {
    if (duration > 30000) {
        log_warn(`slide() called with a duration > 30s (${Math.round(duration) / 1000}s); this might cause issues since OBR's interactions expire in 30s (read more here: https://docs.owlbear.rodeo/extensions/apis/interaction#startiteminteraction)`);
    }

    const item = (await getItems([itemID], interaction))[0];

    if (item == undefined) {
        log_error("slide() called on a non-existing item");
        return;
    }

    if (!isImage(item)) {
        log_error("slide() called on an non-image item");
        return;
    }

    if (interaction == undefined) {
        log_error("slide() called without an interaction manager");
        return;
    }

    const startPosition = item.position;

    const easingFunc = getEasingFunction(easingFunction);

    interaction.registerUpdates([item], (items, t) => {
        const completness = Math.min(t / duration, 1);
        items[0].position = {
            x: startPosition.x + easingFunc(completness) * (position.x - startPosition.x),
            y: startPosition.y + easingFunc(completness) * (position.y - startPosition.y)
        };
        if (t >= duration) {
            return false;
        }
        return true;
    });
}

function slide(interaction: Interaction|undefined, _localOnly: boolean, itemID: string, position: Vector2, duration: number, easingFunction: EasingFunction = "LINEAR") {
    aslide(interaction, itemID, position, duration, easingFunction);
}

function scale(interaction: Interaction|undefined, localOnly: boolean, itemID: string, scaleVector: Vector2) {
    updateItems([itemID], items => {
        for (const item of items) {
            item.scale = {
                x: scaleVector.x * item.scale.x,
                y: scaleVector.y * item.scale.y
            };
        }
    }, interaction, localOnly);
}

async function astretch(interaction: Interaction|undefined, itemID: string, scale: Vector2, duration: number, easingFunction: EasingFunction) {
    if (duration > 30000) {
        log_warn(`stretch() called with a duration > 30s (${Math.round(duration) / 1000}s); this might cause issues since OBR's interactions expire in 30s (read more here: https://docs.owlbear.rodeo/extensions/apis/interaction#startiteminteraction)`);
    }

    if (interaction == undefined) {
        log_error("stretch() called without an interaction manager");
        return;
    }

    // const item = (await OBR.scene.items.getItems([itemID]))[0];
    const item = (await getItems([itemID], interaction))[0];

    if (item == undefined) {
        log_error("stretch() called on a non-existing item");
        return;
    }

    if (!isImage(item)) {
        log_error("stretch() called on an non-image item");
        return;
    }

    const startScale = item.scale;
    const endScale = {
        x: scale.x * startScale.x,
        y: scale.y * startScale.y
    };

    const easingFunc = getEasingFunction(easingFunction);

    interaction.registerUpdates([item], (items, t) => {
        const completness = Math.min(t / duration, 1);
        items[0].scale = {
            x: startScale.x + easingFunc(completness) * (endScale.x - startScale.x),
            y: startScale.y + easingFunc(completness) * (endScale.y - startScale.y)
        }
        if (t >= duration) {
            return false;
        }
        return true;
    });
}

function stretch(interaction: Interaction|undefined, _localOnly: boolean, itemID: string, position: Vector2, duration: number, easingFunction: EasingFunction = "LINEAR") {
    astretch(interaction, itemID, position, duration, easingFunction);
}

function create_token(_interaction: Interaction|undefined, localOnly: boolean, image: SimplifiedItem, position: Vector2, local = false) {
    if (localOnly) {
        return;
    }
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

function message(_interaction: Interaction|undefined, localOnly: boolean, channel: string, data: unknown, destination: "REMOTE" | "LOCAL" | "ALL" = "ALL") {
    if (localOnly) {
        return;
    }
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
    slide: {
        action: actionWrapper(slide),
        desc: {
            requiresItemInteraction: true,
            itemIDsFromArgs: args => args ? [args[0] as string] : [],
            minArgs: 3,
            maxArgs: 4,
            description: "Move item with ID specified by the first argument to a position specified by the second argument, animating the process; the 3rd argument specifies the duration, in milliseconds, and the optional 4th argument specifies the easing function (can be one of \"LINEAR\", \"EASE_IN\", \"EASE_OUT\", or \"EASE_IN_OUT\")",
            argumentType: "[string, vector, number, easing_function]"
        }
    },
    scale: {
        action: actionWrapper(scale),
        desc: {
            minArgs: 2,
            maxArgs: 2,
            description: "Scale item with ID specified by the first argument by a factor specified by the second argument",
            argumentType: "[string, vector]"
        }
    },
    stretch: {
        action: actionWrapper(stretch),
        desc: {
            requiresItemInteraction: true,
            itemIDsFromArgs: args => args ? [args[0] as string] : [],
            minArgs: 3,
            maxArgs: 4,
            description: "Scales the item with ID specified by the first argument by a factor specified by the second argument, animating the process; the 3rd argument specifies the duration, in milliseconds, and the optional 4th argument specifies the easing function (can be one of \"LINEAR\", \"EASE_IN\", \"EASE_OUT\", or \"EASE_IN_OUT\")",
            argumentType: "[string, vector, number, easing_function]"
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
