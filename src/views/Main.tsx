import "./Main.css";

import {
    FaBook,
    FaDisplay,
    FaGear,
    FaHatWizard,
    FaPlus,
} from "react-icons/fa6";
import OBR, { Player } from "@owlbear-rodeo/sdk";

import {
    sendSpellsUpdate,
    setupGMLocalSpells,
    setupPlayerLocalSpells,
} from "../effects/localSpells";
import { setupEffectsTool } from "../effectsTool";
import { useEffect, useMemo, useRef, useState } from "react";

import CustomSpells from "../components/CustomSpells";
import { MessageListener } from "../components/MessageListener";
import SceneControls from "../components/SceneControls";
import Settings from "../components/Settings";
import SpellBook from "../components/SpellBook";
import effectsWorkerScript from "../effects/worker";
import { spellListMetadataKey } from "./NewSpellModal";
import { useOBR } from "../react-obr/providers";
import { Box, Tab, Tabs } from "@mui/material";
import SpellDetails from "../components/SpellDetails";

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

const MENU_OPTIONS = [
    {
        label: "Spellbook",
        icon: <FaBook className="tab-icon" />,
        component: <SpellBook />,
        role: "PLAYER",
    },
    {
        label: "Scene",
        icon: <FaDisplay className="tab-icon" />,
        component: <SceneControls />,
        role: "PLAYER",
    },
    {
        label: "Current Spell",
        icon: <FaHatWizard className="tab-icon" />,
        component: <SpellDetails />,
        role: "PLAYER",
    },
    {
        label: "Custom Spells",
        icon: <FaPlus className="tab-icon" />,
        component: <CustomSpells />,
        role: "GM",
    },
    {
        label: "Settings",
        icon: <FaGear className="tab-icon" />,
        component: <Settings />,
        role: "PLAYER",
    },
];

export default function Main() {
    const obr = useOBR();
    const [effectsWorker, setEffectsWorker] = useState<Worker>();
    const [effectRegister, setEffectRegister] = useState<Map<string, number>>(
        new Map()
    );
    // const [toolSelected, setToolSelected] = useState(false);
    // const [previouslySelectedTab, setPreviouslySelectedTab] = useState(0);
    const [selectedTab, setSelectedTab] = useState(0);
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

    // TODO: Clarify what is the purpose of these hooks
    // useEffect(() => {
    //     if (!obr.ready) {
    //         return;
    //     }

    //     return OBR.tool.onToolChange((tool) => {
    //         const selectedOurTool = tool === toolID;
    //         setToolSelected(selectedOurTool);
    //         setPreviouslySelectedTab(selectedTab);
    //     });
    // }, [obr.ready, selectedTab, previouslySelectedTab]);

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
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
            }}
        >
            <Box>
                <Tabs
                    value={selectedTab}
                    sx={{
                        width: "100%",
                        "& .MuiTabs-flexContainer": {
                            justifyContent: "space-between",
                            px: 2,
                        },
                        pt: 2,
                    }}
                    onChange={(_, value) => setSelectedTab(value)}
                >
                    {MENU_OPTIONS.map((option, index) => {
                        if (option.role == "GM" && !isGM) return;
                        return (
                            <Tab
                                key={index + "-option"}
                                value={index}
                                icon={option.icon}
                                iconPosition="start"
                                sx={{
                                    minWidth: "2rem",
                                    minHeight: 0,
                                    p: 2.5,
                                }}
                            />
                        );
                    })}
                </Tabs>
                <Box
                    sx={{
                        p: 1.5,
                        overflow: "auto",
                        height: "calc(100vh - 200px)", // Adjust the height as needed
                        scrollbarWidth: "thin", // For Firefox
                        "&::-webkit-scrollbar": {
                            width: "8px", // For Chrome, Safari, and Opera
                        },
                    }}
                >
                    {MENU_OPTIONS[selectedTab].component}
                </Box>
            </Box>

            {selectedTab === 0 && (
                <Box sx={{ maxHeight: "110px", overflow: "hidden" }}>
                    <SpellDetails />
                </Box>
            )}
            {effectsWorker && (
                <MessageListener
                    worker={effectsWorker}
                    effectRegister={effectRegister}
                />
            )}
        </Box>
    );
}
