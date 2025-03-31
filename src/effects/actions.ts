import { BlueprintActionBuiltin, BlueprintActionDescription } from "../types/blueprint";
import { EasingFunction, getEasingFunction } from "../utils";
import OBR, { ImageDownload, Item, Vector2, buildImage } from "@owlbear-rodeo/sdk";
import { log_error, log_warn } from "../logging";

import { Draft } from "immer";

async function interactWithItems<T extends Item | Item[]>(items: T, onUpdate: (items: Draft<T>, elapsedMilliseconds: number) => boolean) {
    const key = "interaction:" + crypto.randomUUID();
    const worker = window.EmbersWorker;
    const interaction = await OBR.interaction.startItemInteraction(items);

    return new Promise<T>((resolve) => {
        const startTime = Date.now();
        const onMessage = (message: MessageEvent) => {
            if (message.data === key) {
                const [update, stop] = interaction;
                const now = Date.now();
                let keepGoing = false;
                update(items => {
                    keepGoing = onUpdate(items, now - startTime);
                });

                if (!keepGoing) {
                    stop();
                    worker.removeEventListener("message", onMessage);
                    resolve(items);
                } else {
                    worker.postMessage({ duration: 10, id: key });
                }
            }
        };

        worker.addEventListener("message", onMessage);
        worker.postMessage({ duration: 10, id: key });
    });
}

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

async function aslide(itemID: string, position: Vector2, duration: number, easingFunction: EasingFunction) {
    if (duration > 30000) {
        log_warn(`slide() called with a duration > 30s (${Math.round(duration) / 1000}s); this might cause issues since OBR's interactions expire in 30s (read more here: https://docs.owlbear.rodeo/extensions/apis/interaction#startiteminteraction)`);
    }

    const item = (await OBR.scene.items.getItems([itemID]))[0];
    const startPosition = item.position;

    const easingFunc = getEasingFunction(easingFunction);

    interactWithItems(item, (item, t) => {
        item.position = {
            x: startPosition.x + easingFunc(t / duration) * (position.x - startPosition.x),
            y: startPosition.y + easingFunc(t / duration) * (position.y - startPosition.y)
        };
        if (t >= duration) {
            return false;
        }
        return true;
    }).then(item => {
        OBR.scene.items.updateItems([item], items => {
            items[0]!.position = position;
        });
    });
}

function slide(itemID: string, position: Vector2, duration: number, easingFunction: EasingFunction = "LINEAR") {
    aslide(itemID, position, duration, easingFunction);
}

function scale(itemID: string, scaleVector: Vector2) {
    OBR.scene.items.updateItems([itemID], items => {
        for (const item of items) {
            item.scale = {
                x: scaleVector.x * item.scale.x,
                y: scaleVector.y * item.scale.y
            };
        }
    });
}

async function astretch(itemID: string, scale: Vector2, duration: number, easingFunction: EasingFunction) {
    if (duration > 30000) {
        log_warn(`stretch() called with a duration > 30s (${Math.round(duration) / 1000}s); this might cause issues since OBR's interactions expire in 30s (read more here: https://docs.owlbear.rodeo/extensions/apis/interaction#startiteminteraction)`);
    }

    const item = (await OBR.scene.items.getItems([itemID]))[0];
    const startScale = item.scale;
    const endScale = {
        x: scale.x * startScale.x,
        y: scale.y * startScale.y
    };

    const easingFunc = getEasingFunction(easingFunction);

    interactWithItems(item, (item, t) => {
        item.scale = {
            x: startScale.x + easingFunc(t / duration) * (endScale.x - startScale.x),
            y: startScale.y + easingFunc(t / duration) * (endScale.y - startScale.y)
        }
        if (t >= duration) {
            return false;
        }
        return true;
    }).then(item => {
        OBR.scene.items.updateItems([item], items => {
            items[0]!.scale = endScale;
        });
    });
}

function stretch(itemID: string, position: Vector2, duration: number, easingFunction: EasingFunction = "LINEAR") {
    astretch(itemID, position, duration, easingFunction);
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
    slide: {
        action: actionWrapper(slide),
        desc: {
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
