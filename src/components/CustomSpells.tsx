import "./CustomSpells.css";

import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Fade, FormControl, MenuItem, Select, Typography } from "@mui/material";
import {
    FaCirclePlus,
    FaCopy,
    FaDownload,
    FaPencil,
    FaTrash,
    FaUpload,
} from "react-icons/fa6";
import OBR, { Theme } from "@owlbear-rodeo/sdk";
import { Spell, Spells } from "../types/spells";
import { downloadFileFromString, loadJSONFile } from "../utils";
import { getSpell, spellIDs } from "../effects/spells";
import { newSpellModalID, spellListMetadataKey } from "../views/NewSpellModal";
import { useCallback, useEffect, useRef, useState } from "react";

import { APP_KEY } from "../config";
import { Modal } from "@owlbear-rodeo/sdk/lib/types/Modal";
import { log_info } from "../logging";
import { useOBR } from "../react-obr/providers";

type ModalType = "choose-spell" | "remove-all-spells";

const newSpellModal: Modal = {
    id: newSpellModalID,
    url: "/new-spell-modal",
    fullScreen: false,
};

function getSpellModalSize(
    viewWidth: number,
    viewHeight: number
): [number, number] {
    const aspectRatio = Math.min(viewWidth / viewHeight, 1.5);
    const width = Math.min(800, viewWidth - 100);
    const height = width / aspectRatio;
    return [width, height];
}

function removeSpells(spells: string[]) {
    for (const spell of spells) {
        localStorage.removeItem(`${APP_KEY}/spells/${spell}`);
    }
    const spellListJSON = localStorage.getItem(spellListMetadataKey) ?? "[]";
    const spellList = (JSON.parse(spellListJSON) as string[]).filter(
        (s) => !spells.includes(s)
    );
    localStorage.setItem(spellListMetadataKey, JSON.stringify(spellList));
    OBR.scene.setMetadata({ [spellListMetadataKey]: spellList });
}

function removeAllSpells() {
    const spellListJSON = localStorage.getItem(spellListMetadataKey) ?? "[]";
    const spellList = JSON.parse(spellListJSON) as string[];
    for (const spell of spellList) {
        localStorage.removeItem(`${APP_KEY}/spells/${spell}`);
    }
    localStorage.setItem(spellListMetadataKey, "[]");
    OBR.scene.setMetadata({ [spellListMetadataKey]: [] });
}

function addSpells(spells: Spells | null) {
    if (spells == null) {
        OBR.notification.show("Invalid spell JSON", "ERROR");
        return;
    }
    let added = 0,
        overridden = 0;
    const spellListJSON = localStorage.getItem(spellListMetadataKey) ?? "[]";
    const spellList = JSON.parse(spellListJSON) as string[];
    for (const [spellID, spell] of Object.entries(spells)) {
        added++;
        if (spellList.includes(spellID)) {
            overridden++;
        } else {
            spellList.push(spellID);
        }
        localStorage.setItem(
            `${APP_KEY}/spells/${spellID}`,
            JSON.stringify(spell)
        );
    }
    localStorage.setItem(spellListMetadataKey, JSON.stringify(spellList));
    OBR.scene.setMetadata({ [spellListMetadataKey]: spellList });
    log_info(
        `Added ${added} new spell(s) from file (${overridden} overridden)`
    );
    OBR.notification.show(
        `Successfully added ${added} new spell(s)`,
        "SUCCESS"
    );
}

function verifySpells(spells: unknown) {
    if (spells == null || typeof spells !== "object" || Array.isArray(spells)) {
        return null;
    }
    for (const [key, spell] of Object.entries(spells)) {
        if (
            typeof key !== "string" ||
            typeof spell !== "object" ||
            Array.isArray(spell)
        ) {
            return null;
        }
    }
    return spells as Spells;
}

export default function CustomSpells() {
    const obr = useOBR();
    const [customSpells, setCustomSpells] = useState<string[]>([]);
    const [modalOpened, setModalOpened] = useState<ModalType | null>(null);
    const [selectedSpellID, setSelectedSpellID] = useState("");
    const [theme, setTheme] = useState<Theme>();
    const mainDiv = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const exportCustomSpells = useCallback(() => {
        const spells: Spells = {};
        for (const spellID of customSpells) {
            const spellJSON = localStorage.getItem(
                `${APP_KEY}/spells/${spellID}`
            );
            if (spellJSON == undefined) {
                continue;
            }
            const spell = JSON.parse(spellJSON);
            spells[spellID] = spell;
        }
        downloadFileFromString(JSON.stringify(spells), "spell-export.json");
    }, [customSpells]);

    const openOBRModal = useCallback((spellId?: string) => {
        Promise.all([OBR.viewport.getWidth(), OBR.viewport.getHeight()]).then(
            ([viewWidth, viewHeight]) => {
                const [width, height] = getSpellModalSize(
                    viewWidth,
                    viewHeight
                );
                let url = newSpellModal.url;
                if (spellId) {
                    url += `/${spellId}`;
                }

                OBR.modal.open({
                    ...newSpellModal,
                    url,
                    width,
                    height,
                });
            }
        );
    }, []);

    const closeModal = () => {
        setModalOpened(null);
    };

    useEffect(() => {
        if (!obr.ready) {
            return;
        }

        OBR.theme.getTheme().then(theme => setTheme(theme));
        return OBR.theme.onChange(theme => setTheme(theme));
    }, [obr.ready]);

    useEffect(() => {
        OBR.scene.getMetadata().then((metadata) => {
            if (
                metadata[spellListMetadataKey] &&
                Array.isArray(metadata[spellListMetadataKey])
            ) {
                setCustomSpells(metadata[spellListMetadataKey] as string[]);
            }
        });
        return OBR.scene.onMetadataChange((metadata) => {
            if (
                metadata[spellListMetadataKey] &&
                Array.isArray(metadata[spellListMetadataKey])
            ) {
                setCustomSpells(metadata[spellListMetadataKey] as string[]);
            }
        });
    }, [obr.ready]);

    return (
        <div className="custom-spells" ref={mainDiv}>
            <input
                ref={fileInputRef}
                style={{ display: "none" }}
                accept=".json"
                type="file"
                onChange={(event) =>
                    loadJSONFile(event, (json) => addSpells(verifySpells(json)))
                }
            />
            <div className="custom-spells-section">
                <Typography variant="h6" className="title spellbook-options">
                    Custom Spells
                    <FaCirclePlus
                        style={{ marginLeft: "0.5rem", cursor: "pointer" }}
                        onClick={() => openOBRModal()}
                        title="Add a new custom spell"
                    />
                    <FaCopy
                        title="Add a new custom spell based off of an existing one"
                        style={{ marginLeft: "0.5rem", cursor: "pointer" }}
                        onClick={() => setModalOpened("choose-spell")}
                    />
                    <FaUpload
                        title="Import a list of spells"
                        style={{ marginLeft: "0.5rem", cursor: "pointer" }}
                        onClick={() => fileInputRef.current?.click?.()}
                    />
                    <FaDownload
                        title="Export this list of spells"
                        style={{ marginLeft: "0.5rem", cursor: "pointer" }}
                        onClick={exportCustomSpells}
                    />
                    <FaTrash
                        title="Delete all custom spells"
                        style={{ marginLeft: "0.5rem", cursor: "pointer" }}
                        onClick={() => setModalOpened("remove-all-spells")}
                    />
                </Typography>
                {customSpells.length == 0 && <p>No custom spells yet.</p>}
                <ul className="custom-spells-list">
                    {customSpells.map(spellID => ([spellID, getSpell(`$.${spellID}`, true)] as [string, Spell])).filter(spell => spell[1] != undefined).sort((a, b) => a[1].name?.localeCompare?.(b[1].name ?? "") ?? 0).map(([spellID, spell]) => {
                        return (
                            <li key={spellID} className="custom-spells-item">
                                <p>{spell?.name ?? "N/A"}</p>
                                <div className="row">
                                    <FaPencil
                                        className="clickable custom-spell-action"
                                        onClick={() =>
                                            openOBRModal(
                                                encodeURIComponent(
                                                    `$.${spellID}`
                                                )
                                            )
                                        }
                                        title="Edit this spell"
                                    />
                                    <FaTrash
                                        className="clickable custom-spell-action"
                                        onClick={() => removeSpells([spellID])}
                                        title="Delete this spell (PERMANENT!)"
                                    />
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>
            <Dialog
                open={modalOpened === "choose-spell"}
                onClose={closeModal}
                slots={{ transition: Fade }}
                slotProps={{ transition: { timeout: 300 }, paper: { sx: { backgroundColor: theme?.background?.paper } } }}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>
                    Choose the spell to copy:
                </DialogTitle>

                <DialogContent>
                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <Select
                            labelId="select-spell-label"
                            value={selectedSpellID}
                            onChange={(event) => setSelectedSpellID(event.target.value)}
                            label="Spell"
                            inputProps={{
                                MenuProps: {
                                    MenuListProps: {
                                        sx: {
                                            backgroundColor: theme?.background?.paper
                                        }
                                    }
                                }
                            }}
                        >
                            <MenuItem disabled value="" >
                                Select a spell
                            </MenuItem>
                            {spellIDs
                                .sort((a, b) => a.localeCompare(b))
                                .map((spellID) => {
                                    const spell = getSpell(spellID, true);
                                    if (spell == undefined) return null;
                                    return (
                                        <MenuItem key={spellID} value={spellID}>
                                            {spell.name}
                                        </MenuItem>
                                    );
                                })}
                        </Select>
                    </FormControl>
                </DialogContent>

                <DialogActions sx={{ justifyContent: "space-evenly", padding: "2rem" }}>
                    <Button
                        variant="contained"
                        onClick={() => {
                            closeModal();
                            openOBRModal(selectedSpellID);
                        }}
                    >
                        Add
                    </Button>
                    <Button variant="outlined" onClick={closeModal}>
                        Cancel
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog
                open={modalOpened === "remove-all-spells"}
                onClose={closeModal}
                slots={{ transition: Fade }}
                slotProps={{ transition: { timeout: 300 }, paper: { sx: { backgroundColor: theme?.background?.paper } } }}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>
                    <Typography variant="h6">Delete spell group</Typography>
                </DialogTitle>

                <DialogContent>
                    <Typography variant="body1" gutterBottom>
                        <strong>
                            Are you sure you want to delete <b>all</b> your custom
                            spells?{" "}
                        </strong>
                        This action is irreversible unless you have previously
                        exported this list of spells.
                    </Typography>
                </DialogContent>

                <Box sx={{ alignItems: "center", padding: "2rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <Button variant="outlined" color="inherit" onClick={closeModal}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => {
                            closeModal();
                            removeAllSpells();
                        }}
                    >
                        Yes, delete all spells
                    </Button>
                </Box>
            </Dialog>
        </div>
    );
}
