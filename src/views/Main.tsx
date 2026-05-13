import "./Main.css";

import { Box, Tab, Tabs } from "@mui/material";
import {
    FaBook,
    FaDisplay,
    FaGear,
    FaHatWizard,
    FaPlus,
} from "react-icons/fa6";
import OBR from "@owlbear-rodeo/sdk";
import { toolID } from "../effectsTool";
import { useEffect, useState } from "react";

import CustomSpells from "../components/CustomSpells";
import MovementHandler from "../components/MovementHandler";
import SceneControls from "../components/SceneControls";
import Settings from "../components/Settings";
import SpellBanner from "../components/SpellDetails/SpellBanner";
import SpellBook from "../components/SpellBook";
import SpellDetails from "../components/SpellDetails";
import { useOBR } from "../react-obr/providers";

const MENU_OPTIONS = [
    {
        label: "Spellbook",
        icon: <FaBook className="tab-icon" />,
        component: <SpellBook />,
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
        label: "Scene",
        icon: <FaDisplay className="tab-icon" />,
        component: <SceneControls />,
        role: "PLAYER",
    },
    {
        label: "Settings",
        icon: <FaGear className="tab-icon" />,
        component: <Settings />,
        role: "PLAYER",
    },
];

const SPELL_DETAIL_TAB = 1;

export default function Main() {
    const obr = useOBR();
    // const [toolSelected, setToolSelected] = useState(false);
    const [previouslySelectedTab, setPreviouslySelectedTab] = useState(0);
    const [selectedTab, setSelectedTab] = useState(0);

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
        if (!obr.ready) {
            return;
        }

        return OBR.tool.onToolChange((tool) => {
            const selectedOurTool = tool === toolID;
            // setToolSelected(selectedOurTool);
            setPreviouslySelectedTab(selectedTab);
            setSelectedTab(
                selectedOurTool ? SPELL_DETAIL_TAB : previouslySelectedTab
            );
        });
    }, [obr.ready, selectedTab, previouslySelectedTab]);

    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
            }}
        >
            <Box sx={{ flexGrow: 1 }}>
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
                        height:
                            selectedTab === 0
                                ? "calc(100vh - 7.5rem)"
                                : "calc(100vh - 4rem)", // Adjust the height as needed
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
                <Box sx={{ overflow: "hidden" }}>
                    <SpellBanner
                        onButtonClick={() => {
                            setSelectedTab(SPELL_DETAIL_TAB);
                        }}
                    />
                </Box>
            )}
            <MovementHandler />
        </Box>
    );
}
