import "./Main.css";

import { Tab, TabList, TabPanel, Tabs } from "react-tabs";
import { setupEffectsTool, toolID } from "../effectsTool";
import { useEffect, useState } from "react";

import { MessageListener } from "../components/MessageListener";
import OBR from "@owlbear-rodeo/sdk";
import Settings from "../components/Settings";
import SpellDetails from "../components/SpellDetails";
import effectsWorkerScript from "../effects/worker";
import { setupContextMenu } from "../castSpellMenu";
import { useOBR } from "../react-obr/providers";

export default function Main() {
    const obr = useOBR();
    const [effectsWorker, setEffectsWorker] = useState<Worker>();
    const [effectRegister, setEffectRegister] = useState<Map<string, number>>(new Map());
    const [toolSelected, setToolSelected] = useState(false);
    const [selectedTab, setSelectedTab] = useState(0);

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
        const unmountTool = setupEffectsTool();
        // - setup the effects register
        setEffectRegister(new Map());
        // - setup callback to know when our tool is active
        const unmountToolCallback = OBR.tool.onToolChange(tool => {
            const selectedOurTool = tool === toolID;
            setToolSelected(selectedOurTool);
            setSelectedTab(selectedOurTool ? 1 : 0);
        });
        
        // When the app unmounts, reverse both of those operations
        return () => {
            worker.terminate();
            unmountTool();
            unmountToolCallback();
        };
    }, [obr.ready]);
    
    return (
        <div className="main-container">
            <Tabs selectedIndex={selectedTab} onSelect={tab => setSelectedTab(tab)}>
                <TabList>
                    <Tab>
                        <p className="title no-margin non-selectable">Settings</p>
                    </Tab>
                    <Tab disabled={!toolSelected}>
                        <p className="title no-margin non-selectable">Spell Details</p>
                    </Tab>
                </TabList>
                <TabPanel>
                    <Settings />
                </TabPanel>
                <TabPanel>
                    <SpellDetails />
                </TabPanel>
            </Tabs>
            {
                effectsWorker &&
                <MessageListener worker={effectsWorker} effectRegister={effectRegister} />
            }
        </div>
    )
}
