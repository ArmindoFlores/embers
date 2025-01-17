import { EffectInstruction, MessageType } from "../types/messageListener";
import { aoe, cone, getEffect, projectile } from "../effects";
import { log_error, log_warn } from "../logging";
import { useCallback, useEffect, useState } from "react";

import { AOEEffectMessage } from "../types/aoe";
import { APP_KEY } from "../config";
import { ConeMessage } from "../types/cone";
import OBR from "@owlbear-rodeo/sdk";
import { ProjectileMessage } from "../types/projectile";
import { actions } from "../effects/actions";
import { useOBR } from "../react-obr/providers";

export const MESSAGE_CHANNEL = `${APP_KEY}/effects`;
export const BLUEPRINTS_CHANNEL = `${APP_KEY}/blueprints`;

export function MessageListener({ worker, effectRegister }: { worker: Worker, effectRegister: Map<string, number> }) {
    const obr = useOBR();
    const [dpi, setDpi] = useState(400);

    const processInstruction = useCallback((instruction: EffectInstruction, spellName?: string, spellCaster?: string) => {
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

        const doInstruction = () => {
            if (instruction.id != undefined) {
                if (typeof instruction.id !== "string") {
                    log_error(`Instruction id must be a string, not a "${typeof instruction.id}"`);
                    return;
                }
                if (instruction.type === "effect") {
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
                            worker,
                            instruction.duration,
                            instruction.loops,
                            instruction.metadata,
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
                            worker,
                            instruction.duration,
                            instruction.loops,
                            instruction.metadata,
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
                            worker,
                            instruction.duration,
                            instruction.loops,
                            instruction.metadata,
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
                    const action = actions[instruction.id].action;
                    if (action == undefined) {
                        log_error(`Invalid blueprint: undefined action "${instruction.id}"`);
                        return;
                    }
                    action(...(instruction.arguments ?? []));
                }
                else {
                    log_error(`Invalid instruction type "${instruction.type}"`);
                    return;
                }
            }
        }

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
            worker.addEventListener("message", message => {
                if (message.data === key) {
                    doInstruction();
                }
            });
            worker.postMessage({ duration: instruction.delay, id: key });
        }
        else {
            doInstruction();
        }
    }, [worker, dpi, effectRegister]);

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
            for (const instruction of messageData.instructions) {
                processInstruction(instruction, spellName, spellCaster);
            }
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
