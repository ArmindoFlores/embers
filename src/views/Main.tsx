import "./Main.css";

import { useEffect, useState } from "react";

import Checkbox from "../components/Checkbox";
import { MessageListener } from "../components/MessageListener";
import effectsWorkerScript from "../effects/worker";
import { setupContextMenu } from "../castSpellMenu";
import { setupTargetTool } from "../targetTool";
import { useOBR } from "../react-obr/providers";

export default function Main() {
    const obr = useOBR();
    const [effectsWorker, setEffectsWorker] = useState<Worker>();
    const [effectRegister, setEffectRegister] = useState<Map<string, number>>(new Map());
    const [keepTargets, setKeepTargets] = useState<boolean>(true);

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
    
    return (
        <div className="main-container">
            <p className="title">Settings</p>
            <hr></hr>
            <div className="settings-menu">
                <div className="settings-item">
                    <label htmlFor="recent-spells-list-size">
                        <p>Recent spells list size</p>
                    </label>
                    <input 
                        name="recent-spells-list-size" 
                        type="number"
                        className="settings-input"
                    />
                </div>
                <div className="settings-item">
                    <label htmlFor="recent-spells-list-size">
                        <p>Keep selected targets</p>
                    </label>
                    <Checkbox checked={keepTargets} setChecked={setKeepTargets} />
                </div>
            </div>
            {
                effectsWorker &&
                <MessageListener worker={effectsWorker} effectRegister={effectRegister} />
            }
        </div>
    )
}
