import "./App.css";

import { MESSAGE_CHANNEL, MessageListener } from "./components/MessageListener";
import OBR, { Image } from "@owlbear-rodeo/sdk";
import { useEffect, useState } from "react";

import { APP_KEY } from "./config";
import effectsWorkerScript from "./effects/worker";
import { useOBR } from "./react-obr/providers";

function setupContextMenu() {
    const id = `${APP_KEY}/context-menu`;

    // HUGE HACK
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
    delay(2000).then(() => {
        OBR.contextMenu.create({
            id,
                icons: [
                {
                    icon: "/icon.svg",
                    label: "Cast a spell",
                    filter: {
                        min: 1,
                        max: 2,
                        every: [{ key: "layer", value: "CHARACTER" }, { key: "type", value: "IMAGE" }],
                    },
                },
            ],
            onClick(context) {
                const selectedItems = context.items as Image[];
                const key = `${APP_KEY}/selected-spell`;

                OBR.player.getMetadata().then(metadata => {
                    if (selectedItems.length == 1) {
                        OBR.broadcast.sendMessage(
                            MESSAGE_CHANNEL, 
                            {
                                instructions: [{
                                    effectId: metadata?.[key],
                                    effectInfo: {
                                        position: selectedItems[0].position
                                    }
                                }]
                            },
                            { destination: "ALL" }
                        );
                    }
                    else {
                        const [sourceItem, destinationItem] = selectedItems;
    
                        OBR.broadcast.sendMessage(
                            MESSAGE_CHANNEL, 
                            {
                                instructions: [
                                    {
                                        effectId: metadata?.[key],
                                        effectInfo: {
                                            copies: 3,
                                            source: sourceItem.position,
                                            destination: destinationItem.position
                                        },
                                    },
                                    {
                                        effectId: metadata?.[key],
                                        delay: 300,
                                        effectInfo: {
                                            copies: 3,
                                            source: sourceItem.position,
                                            destination: destinationItem.position
                                        },
                                    }
                                ]
                            },
                            { destination: "ALL" }
                        );
                    }
                });
            },
        });
    });
    return () => {
        OBR.contextMenu.remove(id);
    }
}

function App() {
    const obr = useOBR();
    const [spell, setSpell] = useState("magic_missile");
    const [effectsWorker, setEffectsWorker] = useState<Worker>();
    const [effectRegister, setEffectRegister] = useState<Map<string, number>>(new Map());

    useEffect(() => {
        if (!obr.ready) {
            return;
        }

        // When the app mounts:
        // - create a new worker
        const worker = new Worker(effectsWorkerScript);
        setEffectsWorker(worker);
        // - setup the context menu
        const unmountContextMenu = setupContextMenu();
        // - setup the effects register
        setEffectRegister(new Map());
        
        // When the app unmounts, reverse both of those operations
        return () => {
            unmountContextMenu();
            worker.terminate();
        };
    }, [obr.ready]);

    useEffect(() => {
        const key = `${APP_KEY}/selected-spell`;

        if (!obr.ready || obr.player?.metadata?.[key] == spell) {
            return;
        }
        obr.setPlayerMetadata(({
            [key]: spell
        }));
    }, [obr, spell]);
    
    return (
        <>
            <h1>Magic Missiles</h1>
            <div>
                <label htmlFor="spell_name">Spell: </label>
                <input onChange={e => setSpell(e.target.value)} value={spell}></input>
            </div>
            {
                effectsWorker &&
                <MessageListener worker={effectsWorker} effectRegister={effectRegister} />
            }
        </>
    )
}

export default App
