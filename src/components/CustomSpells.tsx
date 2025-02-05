import "./CustomSpells.css";

import { FaCirclePlus, FaCopy, FaDownload, FaPencil, FaTrash, FaUpload } from "react-icons/fa6";
import { downloadFileFromString, loadJSONFile } from "../utils";
import { getSpell, spellIDs } from "../effects/spells";
import { newSpellModalID, spellListMetadataKey } from "../views/NewSpellModal";
import { useCallback, useEffect, useRef, useState } from "react";

import { APP_KEY } from "../config";
import { Modal } from "@owlbear-rodeo/sdk/lib/types/Modal";
import OBR from "@owlbear-rodeo/sdk";
import ReactModal from "react-modal";
import { Spells } from "../types/spells";
import { log_info } from "../logging";
import { useOBR } from "../react-obr/providers";

type ModalType = "choose-spell" | "remove-all-spells";

const newSpellModal: Modal = {
    id: newSpellModalID,
    url: "/new-spell-modal",
    fullScreen: false
};

function getSpellModalSize(viewWidth: number, viewHeight: number): [number, number] {
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
    const spellList = (JSON.parse(spellListJSON) as string[]).filter(s => !spells.includes(s));
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

function addSpells(spells: Spells|null) {
    if (spells == null) {
        OBR.notification.show("Invalid spell JSON", "ERROR");
        return;
    }
    let added = 0, overridden = 0;
    const spellListJSON = localStorage.getItem(spellListMetadataKey) ?? "[]";
    const spellList = JSON.parse(spellListJSON) as string[];
    for (const [spellID, spell] of Object.entries(spells)) {
        added++;
        if (spellList.includes(spellID)) {
            overridden++;
        }
        else {
            spellList.push(spellID);
        }
        localStorage.setItem(`${APP_KEY}/spells/${spellID}`, JSON.stringify(spell));
    }
    localStorage.setItem(spellListMetadataKey, JSON.stringify(spellList));
    OBR.scene.setMetadata({ [spellListMetadataKey]: spellList });
    log_info(`Added ${added} new spell(s) from file (${overridden} overridden)`);
    OBR.notification.show(`Successfully added ${added} new spell(s)`, "SUCCESS");
}

function verifySpells(spells: unknown) {
    if (spells == null || typeof spells !== "object" || Array.isArray(spells)) {
        return null;
    }
    for (const [key, spell] of Object.entries(spells)) {
        if (typeof key !== "string" || typeof spell !== "object" || Array.isArray(spell)) {
            return null;
        }
    }
    return spells as Spells;
}

export default function CustomSpells() {
    const obr = useOBR();
    const [customSpells, setCustomSpells] = useState<string[]>([]);
    const [isModalClosing, setIsModalClosing] = useState<boolean>(false);
    const [modalOpened, setModalOpened] = useState<ModalType|null>(null);
    const [selectedSpellID, setSelectedSpellID] = useState("");
    const mainDiv = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement|null>(null);

    const exportCustomSpells = useCallback(() => {
        const spells: Spells = {};
        for (const spellID of customSpells) {
            const spellJSON = localStorage.getItem(`${APP_KEY}/spells/${spellID}`);
            if (spellJSON == undefined) {
                continue;
            }
            const spell = JSON.parse(spellJSON);
            spells[spellID] = spell;
        }
        downloadFileFromString(JSON.stringify(spells), "spell-export.json");
    }, [customSpells]);

    const openOBRModal = useCallback((spellId?: string) => {
        Promise.all([OBR.viewport.getWidth(), OBR.viewport.getHeight()]).then(([viewWidth, viewHeight]) => {
            const [width, height] = getSpellModalSize(viewWidth, viewHeight);
            let url = newSpellModal.url;
            if (spellId) {
                url += `/${spellId}`;
            }

            OBR.modal.open({
                ...newSpellModal,
                url,
                width,
                height
            });
        });
    }, []);

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

    useEffect(() => {
        OBR.scene.getMetadata().then(metadata => {
            if (metadata[spellListMetadataKey] && Array.isArray(metadata[spellListMetadataKey])) {
                setCustomSpells(metadata[spellListMetadataKey] as string[]);
            }
        });
        return OBR.scene.onMetadataChange(metadata => {
            if (metadata[spellListMetadataKey] && Array.isArray(metadata[spellListMetadataKey])) {
                setCustomSpells(metadata[spellListMetadataKey] as string[]);
            }
         });
    }, [obr.ready]);

    return <div className="custom-spells" ref={mainDiv}>
        <div className="custom-spells-section">
            <input ref={fileInputRef} style={{ display: "none" }} accept=".json" type="file" onChange={event => loadJSONFile(event, json => addSpells(verifySpells(json)))} />
            <p className="subtitle add-custom-spell">
                Custom Spells
                <FaCirclePlus
                    style={{marginLeft: "0.5rem", cursor: "pointer"}}
                    onClick={() => openOBRModal()}
                    title="Add a new custom spell"
                />
                <FaCopy
                    title="Add a new custom spell based off of an existing one"
                    style={{marginLeft: "0.5rem", cursor: "pointer"}}
                    onClick={() => openModal("choose-spell")}
                />
                <FaUpload
                    title="Import a list of spells"
                    style={{marginLeft: "0.5rem", cursor: "pointer"}}
                    onClick={() => fileInputRef.current?.click?.()}
                />
                <FaDownload
                    title="Export this list of spells"
                    style={{marginLeft: "0.5rem", cursor: "pointer"}}
                    onClick={exportCustomSpells}
                />
                <FaTrash
                    title="Delete all custom spells"
                    style={{marginLeft: "0.5rem", cursor: "pointer"}}
                    onClick={() => openModal("remove-all-spells")}
                />
            </p>
            {
                customSpells.length == 0 &&
                <p>No custom spells yet.</p>
            }
            <ul className="custom-spells-list">
            {
                    customSpells.map(spellID => {
                        const spell = getSpell(`$.${spellID}`, true);
                        return <li key={spellID} className="custom-spells-item">
                            <p>{spell?.name ?? "N/A"}</p>
                            <div className="row">
                                <FaPencil
                                    className="clickable custom-spell-action"
                                    onClick={() => openOBRModal(encodeURIComponent(`$.${spellID}`))}
                                    title="Edit this spell"
                                />
                                <FaTrash
                                    className="clickable custom-spell-action"
                                    onClick={() => removeSpells([spellID])}
                                    title="Delete this spell (PERMANENT!)"
                                />
                            </div>
                        </li>
                    })
                }
            </ul>
        </div>
        <ReactModal
            isOpen={modalOpened === "choose-spell"}
            onRequestClose={closeModal}
            overlayClassName={`modal-overlay ${isModalClosing ? 'fade-out' : ''}`}
            className={`modal-content ${isModalClosing ? 'fade-out' : ''}`}
            appElement={mainDiv.current!}
        >
            <p className="large">Choose the spell to copy:</p>
            <select className="settings-select" value={selectedSpellID} onChange={event => setSelectedSpellID(event.target.value)}>
                <option disabled value="">Select a spell</option>
                {
                    spellIDs.sort((a, b) => a.localeCompare(b)).map(spellID => {
                        const spell = getSpell(spellID, true);
                        if (spell == undefined)
                            return null;
                        return <option key={spellID} value={spellID}>{spell.name}</option>;
                    })
                }
            </select>
            <div style={{height: "1rem"}}></div>
            <div className="row" style={{justifyContent: "space-evenly"}}>
                <button onClick={() => { closeModal(); openOBRModal(selectedSpellID) }}>Edit</button>
                <button className="secondary" onClick={() => closeModal()}>Cancel</button>
            </div>
        </ReactModal>
        <ReactModal
            isOpen={modalOpened === "remove-all-spells"}
            onRequestClose={closeModal}
            overlayClassName={`modal-overlay ${isModalClosing ? 'fade-out' : ''}`}
            className={`modal-content ${isModalClosing ? 'fade-out' : ''}`}
            appElement={mainDiv.current!}
        >
            <p className="large" style={{display: "block"}}>Are you sure you want to delete <b>all</b> your custom spells?</p>
            <p style={{textAlign: "left"}}>This action is irreversible unless you have previously exported this list of spells.</p>
            <div style={{height: "1rem"}}></div>
            <div className="row" style={{justifyContent: "space-evenly"}}>
                <button onClick={() => { closeModal(); removeAllSpells(); }}>Yes, delete all spells</button>
                <button className="secondary" onClick={() => closeModal()}>Cancel</button>
            </div>
        </ReactModal>
    </div>;
}
