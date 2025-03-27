import "./SpellDetails.css";

import { ASSET_LOCATION } from "../../config";
import { Spell } from "../../types/spells";
import OBR, { Metadata } from "@owlbear-rodeo/sdk";
import { useEffect, useState } from "react";
import { getSpell } from "../../effects/spells";
import { toolMetadataSelectedSpell } from "../../effectsTool";
import { useOBR } from "../../react-obr/providers";
import {
    Box,
    Button,
    Card,
    CardContent,
    Tooltip,
    Typography,
} from "@mui/material";
import { FaBullseye, FaCrosshairs, FaLink } from "react-icons/fa6";
import { FaProjectDiagram } from "react-icons/fa";
// * This component is a summary of the currently selected spell. It displays the spell's name, thumbnail only. *
export default function SpellBanner({
    onButtonClick,
}: {
    onButtonClick: () => void;
}) {
    const obr = useOBR();
    const [selectedSpell, setSelectedSpell] = useState<Spell>();
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

        const setSelected = (metadata: Metadata) => {
            const selectedSpell = metadata?.[toolMetadataSelectedSpell];
            if (typeof selectedSpell == "string") {
                const spell = getSpell(selectedSpell, isGM);
                setSelectedSpell(spell);
            }
        };

        OBR.player.getMetadata().then(setSelected);

        return OBR.player.onChange((player) => setSelected(player.metadata));
    }, [obr.ready, isGM]);

    const renderSpellMode = (replicate: string, minimum: number = 0) => {
        if (replicate === "no") {
            if (minimum > 1) {
                return (
                    <Button
                        variant="outlined"
                        color="primary"
                        size="small"
                        startIcon={<FaLink />}
                        onClick={() => {
                            onButtonClick();
                        }}
                    >
                        Wall Target
                    </Button>
                );
            }

            return (
                <Button
                    variant="outlined"
                    color="primary"
                    size="small"
                    startIcon={<FaBullseye />}
                    onClick={() => {
                        onButtonClick();
                    }}
                >
                    Single Target
                </Button>
            );
        } else if (replicate === "all") {
            return (
                <Button
                    variant="outlined"
                    color="primary"
                    size="small"
                    startIcon={<FaCrosshairs />}
                    onClick={() => {
                        onButtonClick();
                    }}
                >
                    All Targets
                </Button>
            );
        } else {
            return (
                <Button
                    variant="outlined"
                    color="primary"
                    size="small"
                    startIcon={<FaProjectDiagram />}
                    onClick={() => {
                        onButtonClick();
                    }}
                >
                    First Target to All
                </Button>
            );
        }
    };

    return (
        <Card
            sx={{
                display: "flex",
                width: "100%",
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
                backgroundColor: "transparent",
            }}
        >
            {!selectedSpell ? (
                <CardContent sx={{ p: 0, pt: 1.5 }}>
                    <Typography variant="body2" sx={{ m: 1, mb: 0 }}>
                        No active spells. Select one from the spellbook! 🧙‍♂️🔥
                    </Typography>
                </CardContent>
            ) : (
                <>
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            // backgroundImage: `url(${ASSET_LOCATION}/${selectedSpell.thumbnail})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            padding: "0.5rem",
                            justifyContent: "space-between",
                            width: "100%",
                        }}
                    >
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                            }}
                        >
                            <img
                                src={`${ASSET_LOCATION}/${selectedSpell.thumbnail}`}
                                style={{
                                    width: "42px",
                                    height: "42px",
                                }}
                            />
                            <span
                                className="title"
                                style={{
                                    color: "white",
                                    padding: "0.5rem",
                                    borderRadius: "4px",
                                    display: "block",
                                    // flexDirection: "column",
                                }}
                            >
                                {selectedSpell.name}
                            </span>
                        </Box>
                        <Box
                            sx={{
                                display: "flex",
                                // flexDirection: "column",
                                justifyContent: "center",
                                alignItems: "center",
                                gap: "0.25rem",
                                ml: "0.5rem",
                                mr: "1rem",
                            }}
                        >
                            <Tooltip title="Click for more spell details">
                                {renderSpellMode(
                                    selectedSpell.replicate!,
                                    selectedSpell.minTargets
                                )}
                            </Tooltip>
                        </Box>
                    </Box>
                </>
            )}
        </Card>
    );
}
