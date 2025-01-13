import "./SpellBook.css";

import { APP_KEY, ASSET_LOCATION } from "../config";
import { FaCaretDown, FaCaretUp, FaCirclePlus, FaFloppyDisk, FaPencil, FaTrash } from "react-icons/fa6";
import { getAllSpellNames, getSpell, spellIDs } from "../effects/spells";
import { setSelectedSpell, toolID } from "../effectsTool";
import { useCallback, useEffect, useRef, useState } from "react";

import OBR from "@owlbear-rodeo/sdk";
import ReactModal from "react-modal";
import { useOBR } from "../react-obr/providers";

type ModalType = "create-spell-group" | "add-spell" | "delete-spell-group" | "delete-spell" | "change-group-name";
export const playerMetadataSpellbookKey = `${APP_KEY}/spellbook`;

export default function SpellBook() {
    const obr = useOBR();
    const [groups, setGroups] = useState<Record<string, string[]>>({});
    const [isModalClosing, setIsModalClosing] = useState<boolean>(false);
    const [modalOpened, setModalOpened] = useState<ModalType|null>(null);
    const [groupName, setGroupName] = useState<string>("");
    const [newGroupName, setNewGroupName] = useState<string>("");
    const [selectedSpellID, setSelectedSpellID] = useState<string>("");
    const [allSpellIDs, setAllSpellIDs] = useState<string[]>(spellIDs);
    const [editing, setEditing] = useState(false);
    const [isGM, setIsGM] = useState(false);
    const mainDiv = useRef<HTMLDivElement>(null);

    const openModal = (modalName: ModalType) => {
        setIsModalClosing(false);
        setModalOpened(modalName);
    };

    const closeModal = () => {
        setIsModalClosing(true);
        setTimeout(() => {
            setModalOpened(null);
            setIsModalClosing(false);
        }, 300);
    };

    const confirmGroupName = useCallback((groupName: string) => {
        if (groupName.length == 0 || Object.keys(groups).includes(groupName)) {
            return;
        }
        OBR.player.setMetadata({
            [playerMetadataSpellbookKey]: {
                ...groups,
                [groupName]: []
            }
        });
        closeModal();
    }, [groups]);

    const editGroupName = useCallback((groupName: string, newGroupName: string) => {
        if (newGroupName.length == 0 || Object.keys(groups).includes(newGroupName)) {
            return;
        }
        OBR.player.setMetadata({
            [playerMetadataSpellbookKey]: {
                ...Object.fromEntries(Object.entries(groups).filter(([oldGroupName]) => oldGroupName != groupName)),
                [newGroupName]: groups[groupName] ?? []
            }
        });
        closeModal();
    }, [groups]);

    const deleteSpellGroup = useCallback((groupName: string) => {
        OBR.player.setMetadata({
            [playerMetadataSpellbookKey]: {
                ...Object.fromEntries(Object.entries(groups).filter(([oldGroupName]) => oldGroupName != groupName)),
            }
        });
        closeModal();
    }, [groups]);

    const addSpellToGroup = useCallback((groupName: string, spellID: string) => {
        OBR.player.setMetadata({
            [playerMetadataSpellbookKey]: {
                ...groups,
                [groupName]: [...(groups[groupName] ?? []), spellID]
            }
        });
        closeModal();
    }, [groups]);

    const deleteSpellFromGroup = useCallback((groupName: string, spellID: string) => {
        OBR.player.setMetadata({
            [playerMetadataSpellbookKey]: {
                ...groups,
                [groupName]: [...(groups[groupName] ?? []).filter(spell => spellID != spell)]
            }
        });
    }, [groups]);

    const moveSpellGroup = useCallback((oldIndex: number, newIndex: number) => {
        const entries = Object.entries(groups);
        const newEntries = Object.entries(groups);
        newEntries.splice(oldIndex, 1, entries[newIndex]);
        newEntries.splice(newIndex, 1, entries[oldIndex]);

        OBR.player.setMetadata({
            [playerMetadataSpellbookKey]: {
                ...Object.fromEntries(newEntries),
            }
        });
    }, [groups]);

    const castSpell = useCallback((spellID: string) => {
        OBR.tool.activateTool(toolID);
        setSelectedSpell(spellID);
    }, []);

    useEffect(() => {
        if (!obr.ready) {
            return;
        }

        OBR.player.getMetadata().then(metadata => {
            const spellBook = metadata[playerMetadataSpellbookKey];
            if (spellBook != undefined && typeof spellBook == "object") {
                setGroups(spellBook as Record<string, string[]>);
            }
            else {
                setGroups({});
            }
        });

        return OBR.player.onChange(player => {
            const spellBook = player.metadata[playerMetadataSpellbookKey];
            if (spellBook != undefined && typeof spellBook == "object") {
                setGroups(spellBook as Record<string, string[]>);
            }
            else {
                setGroups({});
            }
        });

    }, [obr.ready]);

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


        getAllSpellNames().then(names => setAllSpellIDs(names));
        return OBR.scene.onMetadataChange(() => {
            getAllSpellNames().then(names => setAllSpellIDs(names));
        });

    }, [obr.ready, obr.sceneReady]);

    return <div ref={mainDiv}>
        <div className="spellbook-header">
            <p className="title spellbook-options">
                Spellbook
                <FaCirclePlus
                    style={{marginLeft: "0.5rem", cursor: "pointer", display: editing ? undefined : "none"}}
                    onClick={() => { setGroupName(""); openModal("create-spell-group") }}
                    title="Add a new spell group"
                />
            </p>
            {
                editing &&
                <FaFloppyDisk
                    className="clickable"
                    title="Save changes"
                    onClick={() => setEditing(false)}
                />
            }
            {
                !editing &&
                <FaPencil
                    className="clickable"
                    title="Edit your spellbook"
                    onClick={() => setEditing(true)}
                />
            }
        </div>
        {
            Object.entries(groups).map(([groupName, spells], index) => (
                <div key={index}>
                    <p className="subtitle spellbook-group">
                        { groupName }
                        <FaCirclePlus
                            style={{marginLeft: "0.5rem", cursor: "pointer", display: editing ? undefined : "none"}}
                            onClick={() => { setGroupName(groupName); openModal("add-spell"); }}
                            title="Add spell to this group"
                        />
                        <FaPencil
                            style={{marginLeft: "0.5rem", cursor: "pointer", display: editing ? undefined : "none"}}
                            onClick={() => { setGroupName(groupName); setNewGroupName(groupName); openModal("change-group-name"); }}
                            title="Change the name of this group"
                        />
                        <FaTrash
                            style={{marginLeft: "0.5rem", cursor: "pointer", display: editing ? undefined : "none"}}
                            onClick={() => {
                                if (groups[groupName] == undefined || groups[groupName].length == 0) {
                                    deleteSpellGroup(groupName);
                                }
                                else {
                                    setGroupName(groupName);
                                    openModal("delete-spell-group");
                                }
                            }}
                            title="Delete this spell group"
                        />
                        <span className="up-down-arrows">
                            {
                                index != 0 &&
                                <FaCaretUp
                                    style={{marginLeft: "0.5rem", cursor: "pointer", display: editing ? undefined : "none"}}
                                    onClick={() => moveSpellGroup(index, index-1)}
                                />
                            }
                            {
                                index != Object.keys(groups).length-1 &&
                                <FaCaretDown
                                    style={{marginLeft: "0.5rem", cursor: "pointer", display: editing ? undefined : "none"}}
                                    onClick={() => moveSpellGroup(index, index+1)}
                                />
                            }
                        </span>
                    </p>
                    <ul className="spellgroup-list">
                        {
                            spells.map((spellID, index) => {
                                const spell = getSpell(spellID, isGM);
                                if (spell == undefined) {
                                    return null;
                                }
                                return <li key={index} className={editing ? "" : "clickable"} onClick={() => editing ? null : castSpell(spellID)}>
                                    <div className="spellgroup-item-header">
                                        <img className="spellgroup-thumbnail" src={`${ASSET_LOCATION}/${spell.thumbnail}`} />
                                        <p>{ spell.name }</p>
                                    </div>
                                    <div className="spellgroup-item-actions">
                                        <FaTrash
                                            style={{marginLeft: "0.5rem", cursor: "pointer", display: editing ? undefined : "none"}}
                                            onClick={() => deleteSpellFromGroup(groupName, spellID)}
                                        />
                                    </div>
                                </li>;
                            })
                        }
                    </ul>
                </div>
            ))
        }
        {
            Object.keys(groups).length == 0 &&
            <p>No spell groups. Perhaps start by <span className="underlined clickable" onClick={() => openModal("create-spell-group")}>creating one?</span></p>
        }

<ReactModal
            isOpen={modalOpened === "create-spell-group"}
            onRequestClose={closeModal}
            overlayClassName={`modal-overlay ${isModalClosing ? 'fade-out' : ''}`}
            className={`modal-content ${isModalClosing ? 'fade-out' : ''}`}
            appElement={mainDiv.current!}
        >
            <p className="title" style={{display: "block"}}>Create new spell group</p>
            <p style={{textAlign: "left"}}>Please choose a name for this spell group:</p>
            <div style={{height: "1rem"}}></div>
            <input className="modal-input" value={groupName} onChange={event => setGroupName(event.target.value)}/>
            <div style={{height: "1rem"}}></div>
            <div className="row" style={{justifyContent: "space-evenly"}}>
                <button onClick={() => confirmGroupName(groupName)}>Confirm</button>
            </div>
        </ReactModal>
        <ReactModal
            isOpen={modalOpened === "change-group-name"}
            onRequestClose={closeModal}
            overlayClassName={`modal-overlay ${isModalClosing ? 'fade-out' : ''}`}
            className={`modal-content ${isModalClosing ? 'fade-out' : ''}`}
            appElement={mainDiv.current!}
        >
            <p className="title" style={{display: "block"}}>Edit spell group name</p>
            <p style={{textAlign: "left"}}>Please choose a new name for this spell group:</p>
            <div style={{height: "1rem"}}></div>
            <input className="modal-input" value={newGroupName} onChange={event => setNewGroupName(event.target.value)}/>
            <div style={{height: "1rem"}}></div>
            <div className="row" style={{justifyContent: "space-evenly"}}>
                <button onClick={() => editGroupName(groupName, newGroupName)}>Confirm</button>
            </div>
        </ReactModal>
        <ReactModal
            isOpen={modalOpened === "delete-spell-group"}
            onRequestClose={closeModal}
            overlayClassName={`modal-overlay ${isModalClosing ? 'fade-out' : ''}`}
            className={`modal-content ${isModalClosing ? 'fade-out' : ''}`}
            appElement={mainDiv.current!}
        >
            <p className="title" style={{display: "block"}}>Delete spell group</p>
            <p style={{textAlign: "left"}}>Are you sure you want to delete this spell group?</p>
            <div style={{height: "1rem"}}></div>
            <div className="row" style={{justifyContent: "space-evenly"}}>
                <button onClick={() => deleteSpellGroup(groupName)}>Yes, delete it</button>
                <button className="secondary" onClick={closeModal}>Cancel</button>
            </div>
        </ReactModal>
        <ReactModal
            isOpen={modalOpened === "add-spell"}
            onRequestClose={closeModal}
            overlayClassName={`modal-overlay ${isModalClosing ? 'fade-out' : ''}`}
            className={`modal-content ${isModalClosing ? 'fade-out' : ''}`}
            appElement={mainDiv.current!}
        >
            <p className="large">Choose spell to add:</p>
            <select className="settings-select" value={selectedSpellID} onChange={event => setSelectedSpellID(event.target.value)}>
                <option disabled value="">Select a spell</option>
                {
                    allSpellIDs.sort((a, b) => a.localeCompare(b)).map(spellID => {
                        const spell = getSpell(spellID, isGM);
                        if (spell == undefined)
                            return null;
                        return <option key={spellID} value={spellID}>{spell.name}</option>;
                    })
                }
            </select>
            <div style={{height: "1rem"}}></div>
            <div className="row" style={{justifyContent: "space-evenly"}}>
                <button onClick={() => { closeModal(); addSpellToGroup(groupName, selectedSpellID) }}>Add</button>
                <button className="secondary" onClick={closeModal}>Cancel</button>
            </div>
        </ReactModal>
    </div>;
}
