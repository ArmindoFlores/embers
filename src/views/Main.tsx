import "./Main.css";

import { useEffect, useState } from "react";

import { APP_KEY } from "../config";
import { MessageListener } from "../components/MessageListener";
import OBR from "@owlbear-rodeo/sdk";
import effectsWorkerScript from "../effects/worker";
import { setupContextMenu } from "../castSpellMenu";
import { setupTargetTool } from "../targetTool";
import { useOBR } from "../react-obr/providers";

export default function Main() {
    const obr = useOBR();
    const [spell, setSpell] = useState("magic_missile");
    const [blueprint, setBlueprint] = useState("[]");
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
        setupContextMenu();
        // - setup tool
        setupTargetTool();
        // - setup the effects register
        setEffectRegister(new Map());
        
        // When the app unmounts, reverse both of those operations
        return () => {
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

    useEffect(() => {
        OBR.player.setMetadata({ [`${APP_KEY}/current_blueprint`]: blueprint });
    }, [blueprint]);
    
    return (
        <>
            <h1>Magic Missiles</h1>
            <div>
                <label htmlFor="spell_name">Spell: </label>
                <input name="spell_name" onChange={e => setSpell(e.target.value)} value={spell}></input>
            </div>
            <div>
                <label htmlFor="blueprint">Blueprint: </label>
                <textarea name="blueprint" onChange={e => setBlueprint(e.target.value)} value={blueprint}></textarea>
            </div>
            {
                effectsWorker &&
                <MessageListener worker={effectsWorker} effectRegister={effectRegister} />
            }
        </>
    )
}
