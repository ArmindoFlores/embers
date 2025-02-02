import "./Main.css";

import {
    FaBook,
    FaDisplay,
    FaGear,
    FaHatWizard,
    FaPlus,
} from "react-icons/fa6";
import OBR, { Player } from "@owlbear-rodeo/sdk";
import { Tab, TabList, TabPanel, Tabs } from "react-tabs";
import {
    sendSpellsUpdate,
    setupGMLocalSpells,
    setupPlayerLocalSpells,
} from "../effects/localSpells";
import { setupEffectsTool, toolID } from "../effectsTool";
import { useEffect, useMemo, useRef, useState } from "react";

import CustomSpells from "../components/CustomSpells";
import { MessageListener } from "../components/MessageListener";
import SceneControls from "../components/SceneControls";
import Settings from "../components/Settings";
import SpellBook from "../components/SpellBook";
import SpellDetails from "../components/SpellDetails";
import effectsWorkerScript from "../effects/worker";
import { spellListMetadataKey } from "./NewSpellModal";
import { useOBR } from "../react-obr/providers";

function hasPartyChanged(prevParty: Player[], currentParty: Player[]) {
    if (!prevParty || prevParty.length !== currentParty.length) {
        return true;
    }

    for (let i = 0; i < currentParty.length; i++) {
        if (
            prevParty[i].id !== currentParty[i].id ||
            prevParty[i].connectionId !== currentParty[i].connectionId
        ) {
            return true;
        }
    }

    return false;
}

export default function Main() {
    const obr = useOBR();
    const [effectsWorker, setEffectsWorker] = useState<Worker>();
    const [effectRegister, setEffectRegister] = useState<Map<string, number>>(
        new Map()
    );
    const [toolSelected, setToolSelected] = useState(false);
    const [selectedTab, setSelectedTab] = useState(0);
    const [previouslySelectedTab, setPreviouslySelectedTab] = useState(0);
    const previousPartyRef = useRef<{
        players: Player[];
        connections: Record<string, string>;
    }>({ players: [], connections: {} });
    const playerConnections = useMemo(() => {
        if (!obr.ready) {
            return {};
        }

        if (!hasPartyChanged(previousPartyRef.current.players, obr.party)) {
            return previousPartyRef.current.connections;
        }

        const newConnections = Object.fromEntries(
            obr.party.map((player) => [player.connectionId, player.id])
        );
        previousPartyRef.current = {
            connections: newConnections,
            players: obr.party,
        };
        return newConnections;
    }, [obr.ready, obr.party]);

    const [isGM, setIsGM] = useState(false);

    useEffect(() => {
        if (!obr.ready || !obr.player?.role) {
            return;
        }
        if (obr.player.role != "GM" && isGM) {
            setIsGM(false);
        } else if (obr.player.role == "GM" && !isGM) {
            setIsGM(true);
        }
    }, [obr.ready, obr.player?.role, isGM]);

    useEffect(() => {
        if (
            !obr.ready ||
            !obr.sceneReady ||
            !obr.player?.role ||
            !obr.player?.id
        ) {
            return;
        }
        // When the app mounts:
        // - create a new worker
        const worker = new Worker(effectsWorkerScript);
        setEffectsWorker(worker);
        // - setup the context menu
        // setupContextMenu(obr.player.role);
        // - setup tool
        const unmount = setupEffectsTool(obr.player.role, obr.player.id);
        // - setup the effects register
        setEffectRegister(new Map());

        // When the app unmounts, reverse both of those operations
        return () => {
            worker.terminate();
            unmount();
        };
    }, [obr.ready, obr.sceneReady, obr.player?.role, obr.player?.id]);

    useEffect(() => {
        if (!obr.ready || !obr.player?.role || !obr.player?.id) {
            return;
        }

        const hooks: (() => void)[] = [];
        if (obr.player.role !== "GM") {
            hooks.push(setupPlayerLocalSpells(OBR.room.id, obr.player.id));
        } else {
            hooks.push(setupGMLocalSpells(playerConnections));
        }

        return () => {
            for (const hook of hooks) {
                hook();
            }
        };
    }, [obr.ready, playerConnections, obr.player?.id, obr.player?.role]);

    useEffect(() => {
        if (!obr.ready) {
            return;
        }

        return OBR.tool.onToolChange((tool) => {
            const selectedOurTool = tool === toolID;
            setToolSelected(selectedOurTool);
            setPreviouslySelectedTab(selectedTab);
            setSelectedTab(selectedOurTool ? 3 : previouslySelectedTab);
        });
    }, [obr.ready, selectedTab, previouslySelectedTab]);

    useEffect(() => {
        if (!obr.ready || !obr.sceneReady || obr.player?.role != "GM") {
            return;
        }

        // Update scene metadata
        const spellListJSON = localStorage.getItem(spellListMetadataKey);
        if (spellListJSON == undefined) {
            return;
        }
        const spellList = JSON.parse(spellListJSON);
        OBR.scene.setMetadata({ [spellListMetadataKey]: spellList });
    }, [obr.ready, obr.sceneReady, obr.player?.role]);

    useEffect(() => {
        if (!obr.ready || !obr.sceneReady || obr.player?.role != "GM") {
            return;
        }

        const interval = setInterval(() => {
            sendSpellsUpdate("all");
        }, 30000);

        return () => clearInterval(interval);
    }, [obr.ready, obr.sceneReady, obr.player?.role]);

    return (
        <div className="main-container">
            <Tabs
                selectedIndex={selectedTab}
                onSelect={(tab) => setSelectedTab(tab)}
            >
                <TabList>
                    <Tab>
                        <p className="title no-margin non-selectable">
                            <FaBook className="tab-icon" />
                            {selectedTab === 0 ? "Spellbook" : null}
                        </p>
                    </Tab>
                    <Tab>
                        <p className="title no-margin non-selectable">
                            <FaGear className="tab-icon" />
                            {selectedTab === 1 ? "Settings" : null}
                        </p>
                    </Tab>
                    <Tab disabled={!obr.sceneReady}>
                        <p className="title no-margin non-selectable">
                            <FaDisplay className="tab-icon" />
                            {selectedTab === 2 ? "Scene" : null}
                        </p>
                    </Tab>
                    <Tab disabled={!toolSelected}>
                        <p className="title no-margin non-selectable">
                            <FaHatWizard className="tab-icon" />
                            {selectedTab === 3 ? "Current Spell" : null}
                        </p>
                    </Tab>
                    {isGM && (
                        <Tab>
                            <p className="title no-margin non-selectable">
                                <FaPlus className="tab-icon" />
                                {selectedTab === 4 ? "Custom Spells" : null}
                            </p>
                        </Tab>
                    )}
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
                {isGM && (
                    <TabPanel>
                        <CustomSpells />
                    </TabPanel>
                )}
            </Tabs>
            {effectsWorker && (
                <MessageListener
                    worker={effectsWorker}
                    effectRegister={effectRegister}
                />
            )}
        </div>
    );
}
