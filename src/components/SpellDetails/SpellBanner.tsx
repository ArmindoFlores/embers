import "./SpellDetails.css";

import { ASSET_LOCATION } from "../../config";
import { Spell } from "../../types/spells";
import OBR, { Metadata } from "@owlbear-rodeo/sdk";
import { useEffect, useState } from "react";
import { getSpell } from "../../effects/spells";
import { toolMetadataSelectedSpell } from "../../effectsTool";
import { useOBR } from "../../react-obr/providers";
import { Button, Card, CardContent, Typography } from "@mui/material";
// * This component is a summary of the currently selected spell. It displays the spell's name, thumbnail only. *
export default function SpellBanner() {
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

    return (
        <Card
            sx={{
                display: "flex",
                width: "100%",
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
            }}
        >
            <CardContent sx={{ flex: "1 0 auto", p: 1 }}>
                {!selectedSpell ? (
                    <Typography variant="body2" sx={{ m: 1, mb: 0 }}>
                        No active spells. Select or add one from the spellbook!
                        🧙‍♂️🔥
                    </Typography>
                ) : (
                    <>
                        <div>
                            <div
                                className="spell-details-header"
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    backgroundImage: `url(${ASSET_LOCATION}/${selectedSpell.thumbnail})`,
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                    padding: "0.5rem",
                                }}
                            >
                                <div>
                                    <Typography
                                        component="div"
                                        variant="caption"
                                    >
                                        Current Spell
                                    </Typography>
                                    <span
                                        className="title"
                                        style={{
                                            backgroundColor:
                                                "rgba(0, 0, 0, 0.75)", // Faded black background
                                            color: "white",
                                            padding: "0.5rem",
                                            borderRadius: "4px",
                                            display: "block",
                                            // flexDirection: "column",
                                        }}
                                    >
                                        {selectedSpell.name}
                                    </span>
                                </div>
                                <Button variant="outlined" sx={{ ml: 1 }}>
                                    Cast!
                                </Button>
                                <img
                                    className="spell-details-thumbnail"
                                    src={`${ASSET_LOCATION}/${selectedSpell.thumbnail}`}
                                />
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
