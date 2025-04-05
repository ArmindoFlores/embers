import { EffectInstruction, InteractionData, MessageType } from "../types/messageListener";
import { LOCAL_STORAGE_KEYS, getSettingsValue } from "./Settings";
import OBR, { Image, InteractionManager, isImage } from "@owlbear-rodeo/sdk";
import { aoe, cone, getEffect, projectile } from "../effects";
import { log_error, log_warn } from "../logging";
import { useCallback, useEffect, useState } from "react";

import { AOEEffectMessage } from "../types/aoe";
import { APP_KEY } from "../config";
import { ConeMessage } from "../types/cone";
import { ProjectileMessage } from "../types/projectile";
import { actions } from "../effects/actions";
import { useOBR } from "../react-obr/providers";

export const MESSAGE_CHANNEL = `${APP_KEY}/effects`;
export const BLUEPRINTS_CHANNEL = `${APP_KEY}/blueprints`;

export type InteractionUpdateFunc = (items: Image[], elapsed: number) => boolean;

export interface Interaction {
    manager: InteractionManager<Image[]>;
    registerUpdates: (items: Image[], onUpdate: InteractionUpdateFunc) => Promise<Image[]>;
    trackedIDs: string[];
    getLastKnownState: (items: string[]) => Image[];
}

async function createItemInteractions({ ids, count }: InteractionData, localOnly: boolean): Promise<Interaction> {
    const originalItems = await OBR.scene.items.getItems(ids);
    const localItems = originalItems.map(item => ({...item, id: `embers-copy-${item.id}`, visible: true })).filter(item => isImage(item));
    const localItemIDs = localItems.map(item => item.id);
    const originalItemIDs = originalItems.map(item => item.id);

    const setupPromises = [
        OBR.scene.local.addItems(localItems),
    ];
    if (!localOnly) {
        setupPromises.push(
            OBR.scene.items.updateItems(originalItems, items => {
                for (const item of items) {
                    item.visible = false;
                }
            }
        ));
    }
    await Promise.all(setupPromises);

    const [update, stop] = await OBR.interaction.startItemInteraction(localItems);
    const ongoingUpdaters: { start: number, onUpdate: InteractionUpdateFunc, items: Image[], resolve: (items: Image[]) => void, resolved: boolean }[] = [];

    const updateDelay = 1000 / getSettingsValue(LOCAL_STORAGE_KEYS.ANIMATION_UPDATE_RATE);

    // Register a callback every "updateDelay" milliseconds
    const key = "interaction:" + crypto.randomUUID();
    const worker = window.embersWorker;
    let latestItems: Image[] = [];

    const onMessage = (message: MessageEvent) => {
        if (message.data === key) {
            const now = Date.now();

            latestItems = update(itemsToUpdate => {
                for (const updater of ongoingUpdaters) {
                    const elapsed = now - updater.start;
                    const updaterItemIDs = updater.items.map(item => item.id.startsWith("embers-copy-") ? item.id : `embers-copy-${item.id}`);
                    const keepGoing = updater.onUpdate(
                        itemsToUpdate.filter(itemToUpdate => updaterItemIDs.includes(itemToUpdate.id.toString())),
                        elapsed
                    );
                    if (!keepGoing) {
                        count--;
                        updater.resolve(updater.items);
                        updater.resolved = true;
                    }
                }
            });

            for (let i = ongoingUpdaters.length - 1; i >= 0; i--) {
                if (ongoingUpdaters[i].resolved === true) {
                    ongoingUpdaters.splice(i, 1);
                }
            }

            if (count > 0) {
                worker.postMessage({ duration: updateDelay, id: key });
            }
            else {
                worker.removeEventListener("message", onMessage);
                stop();
                if (!localOnly) {
                    OBR.scene.items.updateItems(originalItemIDs, items => {
                        for (const item of items) {
                            const localItem = latestItems.find(latestItem => latestItem.id === `embers-copy-${item.id}`);
                            if (!localItem) continue;
                            item.visible = localItem.visible ?? true;
                            item.position = localItem.position;
                            item.scale = localItem.scale;
                            item.rotation = localItem.rotation;
                            item.locked = localItem.locked;
                        }
                    });
                }
                OBR.scene.local.deleteItems(localItemIDs);
            }
        }
    };

    worker.addEventListener("message", onMessage);
    worker.postMessage({ duration: updateDelay, id: key });

    const registerUpdates = async (items: Image[], onUpdate: InteractionUpdateFunc) => {
        return new Promise<Image[]>(resolve => {
            ongoingUpdaters.push({
                start: (new Date()).getTime(),
                items,
                onUpdate,
                resolve,
                resolved: false
            });
        });
    }

    const getLastKnownState = (items: string[]) => {
        return latestItems.filter(item => items.includes(item.id));
    }

    const onUserCalledStop = () => {
    }

    return {
        manager: [
            update,
            onUserCalledStop
        ],
        registerUpdates,
        trackedIDs: ids,
        getLastKnownState
    };
}

export function MessageListener({ effectRegister }: { effectRegister: Map<string, number> }) {
    const obr = useOBR();
    const [dpi, setDpi] = useState(400);

    const processInstruction = useCallback((instruction: EffectInstruction, spellName?: string, spellCaster?: string, interaction?: Interaction) => {
        const doMoreWork = (instructions?: EffectInstruction[]) => {
            if (instructions == undefined) {
                return;
            }
            if (!Array.isArray(instructions)) {
                log_error("Instructions must be an array of instructions");
                return;
            }
            for (const instruction of instructions) {
                processInstruction(instruction);
            }
        }

        const doInstruction = (playerId: string, playerRole: "GM" | "PLAYER") => {
            if (instruction.id != undefined) {
                if (typeof instruction.id !== "string") {
                    log_error(`Instruction id must be a string, not a "${typeof instruction.id}"`);
                    return;
                }
                if (instruction.type === "effect") {
                    if ((instruction.for === "GM" && playerRole !== "GM") || (instruction.for === "CASTER" && spellCaster !== playerId)) {
                        // This won't be played for this player
                        return;
                    }
                    const effect = getEffect(instruction.id);
                    if (effect == undefined) {
                        log_error(`Couldn't find effect "${instruction.id}"`);
                        return;
                    }
                    const variant = effectRegister.get(instruction.id) ?? 1;
                    if (instruction.duration != undefined && typeof instruction.duration !== "number") {
                        log_error("Effect duration must be a number");
                        return;
                    }
                    if (instruction.loops != undefined && typeof instruction.loops !== "number") {
                        log_error("Effect loops must be a number");
                        return;
                    }
                    if (effect.type === "TARGET" || effect.type === "WALL") {
                        const projectileMessage = instruction.effectProperties as ProjectileMessage;
                        if (projectileMessage.copies == undefined) {
                            projectileMessage.copies = 1;
                        }
                        if (typeof projectileMessage.copies !== "number" || projectileMessage.copies <= 0) {
                            log_error("The number of projectile copies must be an number and be >=0, not", projectileMessage.copies);
                            return;
                        }
                        if (
                            typeof projectileMessage.destination !== "object" ||
                            typeof projectileMessage.destination.x !== "number" ||
                            typeof projectileMessage.destination.y !== "number"
                        ) {
                            log_error("The destination of a projectile must be a Vector2, not", projectileMessage.destination);
                            return;
                        }
                        if (
                            typeof projectileMessage.source !== "object" ||
                            typeof projectileMessage.source.x !== "number" ||
                            typeof projectileMessage.source.y !== "number"
                        ) {
                            log_error("The source of a projectile must be a Vector2, not", projectileMessage.source);
                            return;
                        }

                        effectRegister.set(instruction.id!, (effectRegister.get(instruction.id!) ?? 0) + 1)
                        projectile(
                            {
                                name: instruction.id,
                                dpi,
                                ...projectileMessage
                            },
                            instruction.duration,
                            instruction.loops,
                            instruction.metadata,
                            instruction.layer,
                            instruction.zIndex,
                            () => {
                                effectRegister.set(instruction.id!, (effectRegister.get(instruction.id!) ?? 1) - 1)
                                doMoreWork(instruction.instructions);
                            },
                            variant,
                            spellName,
                            spellCaster
                        );
                    }
                    else if (effect.type === "CONE") {
                        const coneMessage = instruction.effectProperties as ConeMessage;
                        if (
                            typeof coneMessage.size !== "number"
                        ) {
                            log_error("The size of a cone must be a number, not", coneMessage.size);
                            return;
                        }
                        if (
                            typeof coneMessage.rotation !== "number"
                        ) {
                            log_error("The rotation of a cone must be a number, not", coneMessage.rotation);
                            return;
                        }
                        if (
                            typeof coneMessage.source !== "object" ||
                            typeof coneMessage.source.x !== "number" ||
                            typeof coneMessage.source.y !== "number"
                        ) {
                            log_error("The source of a cone must be a number, not", coneMessage.source);
                            return;
                        }

                        effectRegister.set(instruction.id!, (effectRegister.get(instruction.id!) ?? 0) + 1)
                        cone(
                            {
                                name: instruction.id,
                                dpi,
                                ...coneMessage
                            },
                            instruction.duration,
                            instruction.loops,
                            instruction.metadata,
                            instruction.layer,
                            instruction.zIndex,
                            () => {
                                effectRegister.set(instruction.id!, (effectRegister.get(instruction.id!) ?? 1) - 1)
                                doMoreWork(instruction.instructions);
                            },
                            variant,
                            spellName,
                            spellCaster
                        );
                    }
                    else if (effect.type === "CIRCLE") {
                        const aoeEffectMessage = instruction.effectProperties as AOEEffectMessage;
                        if (typeof aoeEffectMessage.size !== "number") {
                            log_error(`The size of an AOE effect must be a number, not a ${typeof aoeEffectMessage.size}`);
                            return;
                        }
                        if (aoeEffectMessage.rotation != undefined && typeof aoeEffectMessage.rotation !== "number") {
                            log_error(`The rotation of an AOE effect must be a number, not a ${typeof aoeEffectMessage.rotation}`);
                            return;
                        }
                        if (
                            typeof aoeEffectMessage.source !== "object" ||
                            typeof aoeEffectMessage.source.x !== "number" ||
                            typeof aoeEffectMessage.source.y !== "number"
                        ) {
                            log_error("The source of an AOE effect must be a Vector2, not", aoeEffectMessage.source);
                            return;
                        }

                        effectRegister.set(instruction.id!, (effectRegister.get(instruction.id!) ?? 0) + 1)
                        aoe(
                            {
                                name: instruction.id,
                                dpi,
                                ...aoeEffectMessage
                            },
                            instruction.duration,
                            instruction.loops,
                            instruction.metadata,
                            instruction.layer,
                            instruction.zIndex,
                            () => {
                                effectRegister.set(instruction.id!, (effectRegister.get(instruction.id!) ?? 1) - 1)
                                doMoreWork(instruction.instructions);
                            },
                            variant,
                            instruction.forceVariant,
                            spellName,
                            spellCaster
                        );
                    }
                }
                else if (instruction.type === "action") {
                    const localOnly = (instruction.for === "GM" && playerRole !== "GM") || (instruction.for === "CASTER" && spellCaster !== playerId);
                    const actionObject = actions[instruction.id];
                    const action = actionObject.action;
                    if (action == undefined) {
                        log_error(`Invalid blueprint: undefined action "${instruction.id}"`);
                        return;
                    }
                    action(interaction, localOnly, ...(instruction.arguments ?? []));
                }
                else {
                    log_error(`Invalid instruction type "${instruction.type}"`);
                    return;
                }
            }
        }

        Promise.all([OBR.player.getId(), OBR.player.getRole()]).then(([playerId, playerRole]) => {
            if (instruction.delay) {
                if (typeof instruction.delay !== "number") {
                    log_error(`Instruction delay must be a number, not a "${typeof instruction.delay}"`);
                    return;
                }

                if (instruction.delay < 0) {
                    log_error(`Instruction delay must be >= 0 (was ${instruction.delay})`);
                    return;
                }

                const key = "ml:" + crypto.randomUUID();

                const messageHandler = (message: MessageEvent) => {
                    if (message.data === key) {
                        doInstruction(playerId, playerRole);
                        window.embersWorker.removeEventListener("message", messageHandler);
                    }
                }

                window.embersWorker.addEventListener("message", messageHandler);
                window.embersWorker.postMessage({ duration: instruction.delay, id: key });
            }
            else {
                doInstruction(playerId, playerRole);
            }
        });
    }, [dpi, effectRegister]);

    useEffect(() => {
        if (!obr.ready || !obr.sceneReady) {
            log_warn("Tried to play an effect while the scene was not ready");
            return;
        }

        const messageChannelUnsubscribe = OBR.broadcast.onMessage(MESSAGE_CHANNEL, message => {
            const messageData = message.data as MessageType;
            if (!Array.isArray(messageData.instructions)) {
                log_error("Malformatted message: message.instructions is not an array");
            }
            const spellName = messageData.spellData ? messageData.spellData.name : undefined;
            const spellCaster = messageData.spellData ? messageData.spellData.caster : undefined;

            OBR.player.getId().then(playerId => {
                const interactionPromise = messageData.interactions.ids.length === 0 ?
                    (new Promise<undefined>(resolve => resolve(undefined))) :
                    createItemInteractions(messageData.interactions, spellCaster != undefined && playerId !== spellCaster);

                interactionPromise.then(interaction => {
                    for (const instruction of messageData.instructions) {
                        processInstruction(instruction, spellName, spellCaster, interaction);
                    }
                }).catch((error: Error) => {
                    log_error(error);
                });
            });
        });

        return () => {
            messageChannelUnsubscribe();
        }
    }, [obr.ready, obr.sceneReady, processInstruction, effectRegister]);

    useEffect(() => {
        if (!obr.ready || !obr.sceneReady) {
            return;
        }
        OBR.scene.grid.getDpi().then(dpi => setDpi(dpi));
        return OBR.scene.grid.onChange(grid => {
            setDpi(grid.dpi);
        });
    }, [obr.ready, obr.sceneReady]);

    return null;
}
