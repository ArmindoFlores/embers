import { EffectInstruction, MessageType } from "../types/messageListener";
import { aoe, cone, getEffect, projectile } from "../effects";
import { log_error, log_warn } from "../logging";
import { useCallback, useEffect, useState } from "react";

import { AOEEffectMessage } from "../types/aoe";
import { APP_KEY } from "../config";
import { ConeMessage } from "../types/cone";
import OBR from "@owlbear-rodeo/sdk";
import { ProjectileMessage } from "../types/projectile";
import { useOBR } from "../react-obr/providers";

export const MESSAGE_CHANNEL = `${APP_KEY}/effects`;
export const BLUEPRINTS_CHANNEL = `${APP_KEY}/blueprints`;

// function _collectInstructionAssets(instruction: EffectInstruction, assets: Set<string>) {
//     if (typeof instruction.effectId === "string") {
//         const effect = getEffect(instruction.effectId);
//         if (effect != undefined) {
//             if (effect.type === "TARGET") {
//                 try {
//                     const projectileMessage = instruction.effectInfo as ProjectileMessage;
//                     const projectileInfo: ProjectileInfo = {
//                         name: instruction.effectId,
//                         copies: projectileMessage.copies,
//                         source: projectileMessage.source,
//                         destination: projectileMessage.destination,
//                         dpi: 1
//                     };
//                     for (const asset of precomputeProjectileAssets(projectileInfo)) {
//                         assets.add(asset);
//                     }
//                 }
//                 catch (e: unknown) {
//                     log_warn(`Error precomputing assets for effect ${instruction.effectId} (${(e as Error).message})`);
//                 }
//             }
//         }
//     }

//     if (Array.isArray(instruction.instructions)) {
//         for (const newInstruction of instruction.instructions) {
//             _collectInstructionAssets(newInstruction, assets);
//         }
//     }
//     return assets;
// }

// // eslint-disable-next-line @typescript-eslint/no-unused-vars
// function collectInstructionAssets(instruction: EffectInstruction) {
//     const assets = new Set<string>();
//     return Array.from(_collectInstructionAssets(instruction, assets).values());
// }

export function MessageListener({ worker, effectRegister }: { worker: Worker, effectRegister: Map<string, number> }) {
    const obr = useOBR();
    const [dpi, setDpi] = useState(400);

    const processInstruction = useCallback((instruction: EffectInstruction) => {
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
            if (instruction.effectId != undefined) {
                if (typeof instruction.effectId !== "string") {
                    log_error(`Instruction effectId must be a string, not a "${typeof instruction.effectId}"`);
                    return;
                }
                const effect = getEffect(instruction.effectId);
                if (effect == undefined) {
                    log_error(`Couldn't find effect "${instruction.effectId}"`);
                    return;
                }
                const variant = effectRegister.get(instruction.effectId) ?? 1;
                if (effect.type === "TARGET") {
                    const projectileMessage = instruction.effectInfo as ProjectileMessage;
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

                    effectRegister.set(instruction.effectId!, (effectRegister.get(instruction.effectId!) ?? 0) + 1)
                    projectile(
                        {
                            name: instruction.effectId,
                            dpi,
                            ...projectileMessage
                        },
                        worker,
                        () => {
                            effectRegister.set(instruction.effectId!, (effectRegister.get(instruction.effectId!) ?? 1) - 1)
                            doMoreWork(instruction.instructions);
                        },
                        variant
                    );
                }
                else if (effect.type === "CONE") {
                    const coneMessage = instruction.effectInfo as ConeMessage;
                    if (
                        typeof coneMessage.destination !== "object" || 
                        typeof coneMessage.destination.x !== "number" ||
                        typeof coneMessage.destination.y !== "number"
                    ) {
                        log_error("The destination of a projectile must be a Vector2, not", coneMessage.destination);
                        return;
                    }
                    if (
                        typeof coneMessage.source !== "object" ||
                        typeof coneMessage.source.x !== "number" ||
                        typeof coneMessage.source.y !== "number"
                    ) {
                        log_error("The source of a projectile must be a Vector2, not", coneMessage.source);
                        return;
                    }

                    effectRegister.set(instruction.effectId!, (effectRegister.get(instruction.effectId!) ?? 0) + 1)
                    cone(
                        {
                            name: instruction.effectId,
                            dpi,
                            ...coneMessage
                        },
                        worker,
                        () => {
                            effectRegister.set(instruction.effectId!, (effectRegister.get(instruction.effectId!) ?? 1) - 1)
                            doMoreWork(instruction.instructions);
                        },
                        variant
                    );
                }
                else if (effect.type === "CIRCLE") {
                    const aoeEffectMessage = instruction.effectInfo as AOEEffectMessage;
                    if (
                        typeof aoeEffectMessage.position !== "object" || 
                        typeof aoeEffectMessage.position.x !== "number" ||
                        typeof aoeEffectMessage.position.y !== "number"
                    ) {
                        log_error("The position of an AOE effect must be a Vector2, not", aoeEffectMessage.position);
                        return;
                    }

                    effectRegister.set(instruction.effectId!, (effectRegister.get(instruction.effectId!) ?? 0) + 1)
                    aoe(
                        {
                            name: instruction.effectId,
                            dpi,
                            ...aoeEffectMessage
                        },
                        worker,
                        () => {
                            effectRegister.set(instruction.effectId!, (effectRegister.get(instruction.effectId!) ?? 1) - 1)
                            doMoreWork(instruction.instructions);
                        },
                        variant
                    );
                }
            }
        }

        if (instruction.delay) {
            if (typeof instruction.delay !== "number") {
                log_error(`Instruction delay must be a number, not a "${typeof instruction.delay}"`);    
                return;
            }

            if (instruction.delay < 0) {
                log_error(`Instruction delay must be >=0 (was ${instruction.delay})`);
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
            
            for (const instruction of messageData.instructions) {
                processInstruction(instruction);
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
