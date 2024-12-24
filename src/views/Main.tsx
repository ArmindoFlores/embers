import "./Main.css";

import { Tab, TabList, TabPanel, Tabs } from "react-tabs";
import { setupEffectsTool, toolID } from "../effectsTool";
import { useEffect, useState } from "react";

import { MessageListener } from "../components/MessageListener";
import OBR from "@owlbear-rodeo/sdk";
import SceneControls from "../components/SceneControls";
import Settings from "../components/Settings";
import SpellBook from "../components/SpellBook";
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
    const [previouslySelectedTab, setPreviouslySelectedTab] = useState(0);

    useEffect(() => {
        if (!obr.ready || !obr.sceneReady || !obr.player?.role || !obr.player?.id) {
            return;
        }
        // When the app mounts:
        // - create a new worker
        const worker = new Worker(effectsWorkerScript);
        setEffectsWorker(worker);
        // - setup the context menu
        setupContextMenu(obr.player.role);
        // - setup tool
        setupEffectsTool(obr.player.role, obr.player.id);
        // - setup the effects register
        setEffectRegister(new Map());
        
        // When the app unmounts, reverse both of those operations
        return () => {
            worker.terminate();
        };
    }, [obr.ready, obr.sceneReady, obr.player?.role, obr.player?.id]);

    useEffect(() => {
        if (!obr.ready) {
            return;
        }

        return OBR.tool.onToolChange(tool => {
            const selectedOurTool = tool === toolID;
            setToolSelected(selectedOurTool);
            setPreviouslySelectedTab(selectedTab);
            setSelectedTab(selectedOurTool ? 3 : previouslySelectedTab);
        });
    }, [obr.ready, selectedTab, previouslySelectedTab]);
    
    return (
        <div className="main-container">
            <Tabs selectedIndex={selectedTab} onSelect={tab => setSelectedTab(tab)}>
                <TabList>
                    <Tab>
                        <p className="title no-margin non-selectable">Book</p>
                    </Tab>
                    <Tab>
                        <p className="title no-margin non-selectable">Settings</p>
                    </Tab>
                    <Tab disabled={!obr.sceneReady}>
                        <p className="title no-margin non-selectable">Scene</p>
                    </Tab>
                    <Tab disabled={!toolSelected}>
                        <p className="title no-margin non-selectable">Spell</p>
                    </Tab>
                </TabList>
                <TabPanel>
                    <SpellBook />
                </TabPanel>
                <TabPanel>
                    <Settings />
                </TabPanel>
                <TabPanel>
                    <SceneControls />
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
