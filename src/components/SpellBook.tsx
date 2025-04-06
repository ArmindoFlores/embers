import "./SpellBook.css";

import { APP_KEY, ASSET_LOCATION } from "../config";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Fade,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import {
    FaCaretDown,
    FaCaretUp,
    FaCirclePlus,
    FaDownload,
    FaFloppyDisk,
    FaPencil,
    FaTrash,
    FaUpload,
} from "react-icons/fa6";
import OBR, { Theme } from "@owlbear-rodeo/sdk";
import { downloadFileFromString, loadJSONFile } from "../utils";
import { getAllSpellNames, getSpell, spellIDs } from "../effects/spells";
import { setSelectedSpell, toolID } from "../effectsTool";
import { useCallback, useEffect, useRef, useState } from "react";

import { Spell } from "../types/spells";
import { useOBR } from "../react-obr/providers";

type ModalType =
    | "create-spell-group"
    | "add-spell"
    | "delete-spell-group"
    | "delete-spell"
    | "change-group-name";
export const playerMetadataSpellbookKey = `${APP_KEY}/spellbook`;

function verifyGroups(json: unknown): Record<string, string[]> | null {
    if (typeof json !== "object" || Array.isArray(json) || json == null) {
        return null;
    }
    for (const [key, value] of Object.entries(json)) {
        if (typeof key !== "string" || !Array.isArray(value)) {
            return null;
        }
        for (const arrayValue of value) {
            if (typeof arrayValue != "string") {
                return null;
            }
        }
    }
    return json as Record<string, string[]>;
}

export default function SpellBook() {
    const obr = useOBR();
    const [groups, _setGroups] = useState<Record<string, string[]>>({});
    const [modalOpened, setModalOpened] = useState<ModalType | null>(null);
    const [groupName, setGroupName] = useState<string>("");
    const [newGroupName, setNewGroupName] = useState<string>("");
    const [selectedSpellID, setSelectedSpellID] = useState<string>("");
    const [allSpellIDs, setAllSpellIDs] = useState<string[]>(spellIDs);
    const [editing, setEditing] = useState(false);
    const [isGM, setIsGM] = useState(false);
    const [theme, setTheme] = useState<Theme>();
    const mainDiv = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const setGroups = useCallback((value: Record<string, string[]> | null) => {
        if (value == null) {
            OBR.notification.show("Invalid spellbook json", "ERROR");
            return;
        }
        localStorage.setItem(
            `${playerMetadataSpellbookKey}/${OBR.room.id}`,
            JSON.stringify(value)
        );
        _setGroups(value);
        OBR.notification.show("Successfully imported spellbook", "SUCCESS");
    }, []);

    const closeModal = () => {
        setModalOpened(null);
    };

    const confirmGroupName = useCallback(
        (groupName: string) => {
            if (
                groupName.length == 0 ||
                Object.keys(groups).includes(groupName)
            ) {
                return;
            }
            setGroups({
                ...groups,
                [groupName]: [],
            });
            closeModal();
        },
        [groups, setGroups]
    );

    const editGroupName = useCallback(
        (groupName: string, newGroupName: string) => {
            if (
                newGroupName.length == 0 ||
                Object.keys(groups).includes(newGroupName)
            ) {
                return;
            }
            setGroups({
                ...Object.fromEntries(
                    Object.entries(groups).filter(
                        ([oldGroupName]) => oldGroupName != groupName
                    )
                ),
                [newGroupName]: groups[groupName] ?? [],
            });
            closeModal();
        },
        [groups, setGroups]
    );

    const deleteSpellGroup = useCallback(
        (groupName: string) => {
            setGroups(
                Object.fromEntries(
                    Object.entries(groups).filter(
                        ([oldGroupName]) => oldGroupName != groupName
                    )
                )
            );
            closeModal();
        },
        [groups, setGroups]
    );

    const addSpellToGroup = useCallback(
        (groupName: string, spellID: string) => {
            setGroups({
                ...groups,
                [groupName]: [...(groups[groupName] ?? []), spellID],
            });
            closeModal();
        },
        [groups, setGroups]
    );

    const deleteSpellFromGroup = useCallback(
        (groupName: string, spellID: string) => {
            setGroups({
                ...groups,
                [groupName]: [
                    ...(groups[groupName] ?? []).filter(
                        (spell) => spellID != spell
                    ),
                ],
            });
        },
        [groups, setGroups]
    );

    const moveSpellGroup = useCallback(
        (oldIndex: number, newIndex: number) => {
            const entries = Object.entries(groups);
            const newEntries = Object.entries(groups);
            newEntries.splice(oldIndex, 1, entries[newIndex]);
            newEntries.splice(newIndex, 1, entries[oldIndex]);

            setGroups(Object.fromEntries(newEntries));
        },
        [groups, setGroups]
    );

    const castSpell = useCallback((spellID: string) => {
        OBR.tool.activateTool(toolID);
        setSelectedSpell(spellID);
    }, []);

    useEffect(() => {
        if (!obr.ready) {
            return;
        }
        OBR.theme.getTheme().then(theme => setTheme(theme));
        return OBR.theme.onChange(theme => setTheme(theme));
    }, [obr.ready]);

    useEffect(() => {
        if (!obr.ready) {
            return;
        }

        const spellbookJSON = localStorage.getItem(
            `${playerMetadataSpellbookKey}/${OBR.room.id}`
        );
        const spellBook = JSON.parse(spellbookJSON ?? "{}");
        _setGroups(spellBook);
    }, [obr.ready, setGroups]);

    useEffect(() => {
        if (!obr.ready || !obr.player?.role) {
            return;
        }

        setIsGM(obr.player.role === "GM");
    }, [obr.ready, obr.player?.role]);

    useEffect(() => {
        if (!obr.ready || !obr.sceneReady) {
            return;
        }

        getAllSpellNames().then((names) => setAllSpellIDs(names));
        return OBR.scene.onMetadataChange(() => {
            getAllSpellNames().then((names) => setAllSpellIDs(names));
        });
    }, [obr.ready, obr.sceneReady]);

    return (
        <div ref={mainDiv} className="spellbook-container">
            <Box className="spellbook-header">
                <input
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    accept=".json"
                    type="file"
                    onChange={(event) =>
                        loadJSONFile(event, (json) =>
                            setGroups(verifyGroups(json))
                        )
                    }
                />
                <Typography
                    mb={"0.5rem"}
                    variant="h6"
                    color="text.primary"
                    className="title spellbook-options"
                >
                    <span>Spell Books</span>
                    {editing && <>
                        <Tooltip title="Add a new spell group">
                            <IconButton
                                size="small"
                                sx={{ ml: 1 }}
                                onClick={() => {
                                    setGroupName("");
                                    setModalOpened("create-spell-group");
                                }}
                            >
                                <FaCirclePlus />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Import your spellbook">
                            <IconButton
                                size="small"
                                sx={{ ml: 1 }}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <FaUpload />
                            </IconButton>
                        </Tooltip>

                        <Tooltip title="Download your spellbook">
                            <IconButton
                                size="small"
                                sx={{ ml: 1 }}
                                onClick={() =>
                                    downloadFileFromString(
                                        JSON.stringify(groups),
                                        "spellbook.json"
                                    )
                                }
                            >
                                <FaDownload />
                            </IconButton>
                        </Tooltip>
                    </>}
                </Typography>
                {editing && (
                    <Tooltip title="Save changes">
                        <IconButton
                            className="clickable"
                            size="small"
                            onClick={() => setEditing(false)}
                        >
                            <FaFloppyDisk />
                        </IconButton>
                    </Tooltip>
                )}
                {!editing && (
                    <Tooltip title="Edit your spellbook">
                        <IconButton
                            className="clickable"
                            size="small"
                            onClick={() => setEditing(true)}
                        >
                            <FaPencil />
                        </IconButton>
                    </Tooltip>
                )}
            </Box>
            {Object.entries(groups).map(([groupName, spells], index) => (
                <Accordion variant="outlined" defaultExpanded key={index}>
                    <AccordionSummary
                        sx={{
                            "&.Mui-expanded": {
                                mt: "0.5rem",
                                minHeight: 0,
                            },
                            "& > .MuiAccordionSummary-content.Mui-expanded": {
                                margin: 0,
                            },
                        }}
                        className="subtitle spellbook-group"
                    >
                        <Box display="flex" alignItems="center" flexWrap="wrap">
                            <Typography variant="subtitle1" color="text.primary">
                                {groupName}
                            </Typography>

                            {editing && (
                                <>
                                    <Tooltip title="Add spell to this group">
                                        <IconButton
                                            component="div"
                                            size="small"
                                            sx={{ ml: 1 }}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                setGroupName(groupName);
                                                setModalOpened("add-spell");
                                            }}
                                        >
                                            <FaCirclePlus />
                                        </IconButton>
                                    </Tooltip>

                                    <Tooltip title="Change the name of this group">
                                        <IconButton
                                            component="div"
                                            size="small"
                                            sx={{ ml: 1 }}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                setGroupName(groupName);
                                                setNewGroupName(groupName);
                                                setModalOpened("change-group-name");
                                            }}
                                        >
                                            <FaPencil />
                                        </IconButton>
                                    </Tooltip>

                                    <Tooltip title="Delete this spell group">
                                        <IconButton
                                            component="div"
                                            size="small"
                                            sx={{ ml: 1 }}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                if (
                                                    groups[groupName] === undefined ||
                                                    groups[groupName].length === 0
                                                ) {
                                                    deleteSpellGroup(groupName);
                                                } else {
                                                    setGroupName(groupName);
                                                    setModalOpened("delete-spell-group");
                                                }
                                            }}
                                        >
                                            <FaTrash />
                                        </IconButton>
                                    </Tooltip>

                                    <Box className="up-down-arrows" display="flex" alignItems="center">
                                        {index !== 0 && (
                                            <Tooltip title="Move up">
                                                <IconButton
                                                    component="div"
                                                    size="small"
                                                    sx={{ ml: 1 }}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        moveSpellGroup(index, index - 1);
                                                    }}
                                                >
                                                    <FaCaretUp />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                        {index !== Object.keys(groups).length - 1 && (
                                            <Tooltip title="Move down">
                                                <IconButton
                                                    component="div"
                                                    size="small"
                                                    sx={{ ml: 1 }}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        moveSpellGroup(index, index + 1);
                                                    }}
                                                >
                                                    <FaCaretDown />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </Box>
                                </>
                            )}
                        </Box>
                    </AccordionSummary>

                    <AccordionDetails>
                        <ul style={{ margin: 0 }} className="spellgroup-list">
                            {spells
                                .map((spellID) => [spellID, getSpell(spellID, isGM)] as [string, Spell])
                                .filter(spell => spell[1] !== undefined)
                                .sort((a, b) =>
                                    a[1].name?.localeCompare?.(b[1].name ?? "") ?? 0
                                )
                                .map(([spellID, spell], index) => (
                                    <li
                                        key={index}
                                        className={editing ? "" : "clickable"}
                                        onClick={() => (editing ? null : castSpell(spellID))}
                                    >
                                        <div className="spellgroup-item-header">
                                            <img
                                                className="spellgroup-thumbnail"
                                                src={`${ASSET_LOCATION}/${spell.thumbnail}`}
                                            />
                                            <p>{spell.name}</p>
                                        </div>
                                        <div className="spellgroup-item-actions">
                                            {editing && (
                                                <Tooltip title="Remove this spell">
                                                    <IconButton
                                                        size="small"
                                                        sx={{ ml: 1 }}
                                                        onClick={() =>
                                                            deleteSpellFromGroup(groupName, spellID)
                                                        }
                                                    >
                                                        <FaTrash />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </div>
                                    </li>
                                ))}
                        </ul>
                    </AccordionDetails>
                </Accordion>
            ))}

            {Object.keys(groups).length < 1 && (
                <Typography variant="body2" textAlign={"center"}>
                    No spell groups found.
                    <br />
                    <span
                        className="underlined clickable"
                        onClick={() => setModalOpened("create-spell-group")}
                    >
                        Add a new spell group.
                    </span>
                </Typography>
            )}
            <Dialog
                open={modalOpened === "create-spell-group"}
                onClose={closeModal}
                slots={{ transition: Fade }}
                slotProps={{ transition: { timeout: 300 }, paper: { sx: { backgroundColor: theme?.background?.paper } } }}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>
                    Create new spell group
                </DialogTitle>

                <DialogContent>
                    <Typography variant="body1" gutterBottom>
                        Please choose a name for this spell group:
                    </Typography>
                    <TextField
                        fullWidth
                        autoFocus
                        margin="dense"
                        variant="outlined"
                        value={groupName}
                        onChange={(event) => setGroupName(event.target.value)}
                        placeholder="Spell group name"
                    />
                </DialogContent>

                <DialogActions sx={{ justifyContent: "space-between", padding: "2rem" }}>
                    <Button variant="outlined" color="inherit" onClick={closeModal}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => confirmGroupName(groupName)}
                    >
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog
                open={modalOpened === "change-group-name"}
                onClose={closeModal}
                slots={{ transition: Fade }}
                slotProps={{ transition: { timeout: 300 }, paper: { sx: { backgroundColor: theme?.background?.paper } } }}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>
                    Edit spell group name
                </DialogTitle>

                <DialogContent>
                    <Typography variant="body1" gutterBottom>
                        Please choose a name for this spell group:
                    </Typography>
                    <TextField
                        fullWidth
                        autoFocus
                        margin="dense"
                        variant="outlined"
                        value={newGroupName}
                        onChange={(event) => setNewGroupName(event.target.value)}
                        placeholder="Spell group name"
                    />
                </DialogContent>

                <DialogActions sx={{ justifyContent: "space-between", padding: "2rem" }}>
                    <Button variant="outlined" color="inherit" onClick={closeModal}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => editGroupName(groupName, newGroupName)}
                    >
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog
                open={modalOpened === "delete-spell-group"}
                onClose={closeModal}
                slots={{ transition: Fade }}
                slotProps={{ transition: { timeout: 300 }, paper: { sx: { backgroundColor: theme?.background?.paper } } }}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>
                    Delete spell group
                </DialogTitle>

                <DialogContent>
                    <Typography variant="body1" gutterBottom>
                        Are you sure you want to delete this spell group?
                    </Typography>
                </DialogContent>

                <DialogActions sx={{ justifyContent: "space-between", padding: "2rem" }}>
                    <Button variant="outlined" color="inherit" onClick={closeModal}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => deleteSpellGroup(groupName)}
                    >
                        Yes, delete it
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog
                open={modalOpened === "add-spell"}
                onClose={closeModal}
                slots={{ transition: Fade }}
                slotProps={{ transition: { timeout: 300 }, paper: { sx: { backgroundColor: theme?.background?.paper } } }}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>
                    Choose spell to add:
                </DialogTitle>

                <DialogContent>
                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel id="select-spell-label">
                            Spell
                        </InputLabel>
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
                            {allSpellIDs
                                .sort((a, b) => a.localeCompare(b))
                                .map((spellID) => {
                                    const spell = getSpell(spellID, isGM);
                                    if (!spell) return null;
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
                            addSpellToGroup(groupName, selectedSpellID);
                        }}
                    >
                        Add
                    </Button>
                    <Button variant="outlined" onClick={closeModal}>
                        Cancel
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}
