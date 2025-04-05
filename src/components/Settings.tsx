import { Button, Checkbox, Typography } from "@mui/material";
import OBR, { GridScale, isImage } from "@owlbear-rodeo/sdk";
import { useCallback, useEffect, useRef, useState } from "react";

/* eslint-disable react-refresh/only-export-components */
import { APP_KEY } from "../config";
import ReactModal from "react-modal";
import { SimplifiedItem } from "../types/misc";
import { useOBR } from "../react-obr/providers";

export const LOCAL_STORAGE_KEYS = {
    MOST_RECENT_SPELLS_LIST_SIZE: "most-recent-list",
    GRID_SCALING_FACTOR: "grid-scaling-factor",
    KEEP_SELECTED_TARGETS: "keep-selected-targets",
    DEFAULT_CASTER: "default-caster",
    ANIMATION_UPDATE_RATE: "animation-update-rate",
};

export const GLOBAL_STORAGE_KEYS = {
    PLAYERS_CAN_CAST_SPELLS: "players-cast-spells",
    SUMMONED_ENTITIES_RULE: "summoned-entities"
};

const DEFAULT_VALUES = {
    [LOCAL_STORAGE_KEYS.MOST_RECENT_SPELLS_LIST_SIZE]: 10,
    [LOCAL_STORAGE_KEYS.GRID_SCALING_FACTOR]: null,
    [LOCAL_STORAGE_KEYS.KEEP_SELECTED_TARGETS]: true,
    [LOCAL_STORAGE_KEYS.DEFAULT_CASTER]: [],
    [LOCAL_STORAGE_KEYS.ANIMATION_UPDATE_RATE]: 50,
    [GLOBAL_STORAGE_KEYS.PLAYERS_CAN_CAST_SPELLS]: true,
    [GLOBAL_STORAGE_KEYS.SUMMONED_ENTITIES_RULE]: "caster",
}

const GRID_UNIT_FACTORS: Record<string, number> = {
    "ft": 1,
    "m": 1.524,
}

type ModalType = "choose-caster-type";

function parseGridScale(raw: string): GridScale {
    const regexMatch = raw.match(/(\d*)(\.\d*)?([a-zA-Z]*)/);
    if (regexMatch) {
        const multiplier = parseFloat(regexMatch[1]);
        const digits = parseFloat(regexMatch[2]);
        const unit = regexMatch[3] || "";
        if (!isNaN(multiplier) && !isNaN(digits)) {
            return {
                raw,
                parsed: {
                    multiplier: multiplier + digits,
                    unit,
                    digits: regexMatch[2].length - 1
                }
            };
        }
        if (!isNaN(multiplier) && isNaN(digits)) {
            return { raw, parsed: { multiplier, unit, digits: 0 } };
        }
    }
    return { raw, parsed: { multiplier: 1, unit: "", digits: 0 } };
}

function tryComputeGridScaling(gridScale: GridScale|null) {
    if (gridScale == null) {
        return null;
    }
    const gridScaleFactor = gridScale.parsed.multiplier;
    const unitFactor = GRID_UNIT_FACTORS[gridScale.parsed.unit] ?? 1;
    return 5 / (gridScaleFactor * unitFactor);
}

export async function getDefaultGridScaleFactor() {
    const gridScale = await OBR.scene.grid.getScale();
    return tryComputeGridScaling(gridScale) ?? 1;
}

export function getSettingsValue(key: string) {
    const settingsObjectString = localStorage.getItem(`${APP_KEY}/settings`);
    if (settingsObjectString == undefined) {
        return DEFAULT_VALUES[key];
    }
    const settingsObject = JSON.parse(settingsObjectString);
    if (settingsObject[key] == undefined) {
        return DEFAULT_VALUES[key];
    }
    return settingsObject[key];
}

export function setSettingsValue(key: string, value: unknown) {
    const settingsObjectString = localStorage.getItem(`${APP_KEY}/settings`);
    if (settingsObjectString == undefined) {
        localStorage.setItem(`${APP_KEY}/settings`, JSON.stringify({ [key]: value }));
        return;
    }
    const settingsObject = JSON.parse(settingsObjectString);
    settingsObject[key] = value;
    localStorage.setItem(`${APP_KEY}/settings`, JSON.stringify(settingsObject));
}

export async function getGlobalSettingsValue(key: string) {
    const metadata = await OBR.scene.getMetadata();
    const settingsObject = metadata[`${APP_KEY}/settings/${key}`];
    if (settingsObject == undefined) {
        return DEFAULT_VALUES[key];
    }
    return settingsObject;
}

export async function setGlobalSettingsValue(key: string, value: unknown) {
    await OBR.scene.setMetadata({
        [`${APP_KEY}/settings/${key}`]: value
    });
}

export default function Settings() {
    const obr = useOBR();

    const [mostRecentSize, _setMostRecentSize] = useState<number|null>(null);
    const [gridScalingFactor, _setGridScalingFactor] = useState<number|null>(null);
    const [keepTargets, setKeepTargets] = useState<boolean|null>(null);
    const [playersCastSpells, setPlayersCastSpells] = useState<boolean|null>(null);
    const [summonedEntities, setSummonedEntities] = useState<string|null>(null);
    const [gridScale, setGridScale] = useState<GridScale|null>(null);
    const [defaultCaster, setDefaultCaster] = useState<SimplifiedItem[]|null>(null);
    const [animationRate, _setAnimationRate] = useState<number|null>(null);
    const [isModalClosing, setIsModalClosing] = useState(false);
    const [modalOpened, setModalOpened] = useState<ModalType|null>(null);
    const mainDiv = useRef<HTMLDivElement>(null);

    const setMostRecentSize = useCallback((size: string) => {
        const recentSize = parseInt(size);
        if (isNaN(recentSize)) {
            _setMostRecentSize(null);
            return;
        }
        _setMostRecentSize(recentSize);
    }, []);

    const setGridScalingFactor = useCallback((factor: string) => {
        const scaleFactor = parseFloat(factor);
        if (isNaN(scaleFactor)) {
            _setGridScalingFactor(null);
            return;
        }
        _setGridScalingFactor(scaleFactor);
    }, []);

    const setAnimationRate = useCallback((rate: string) => {
        const intRate = parseInt(rate);
        if (isNaN(intRate)) {
            _setAnimationRate(null);
            return;
        }
        _setAnimationRate(intRate);
    }, []);

    const handleAssetPicker = useCallback(() => {
        OBR.assets.downloadImages(true).then(selection => {
            if (selection.length > 0) {
                setDefaultCaster(selection);
            }
        })
    }, []);

    const handleSetCasterFromSelection = useCallback(() => {
        OBR.player.getSelection().then(itemIDs => {
            OBR.scene.items.getItems(itemIDs).then(items => {
                const selection = items.filter(item => isImage(item));
                if (selection.length > 0) {
                    setDefaultCaster(selection.map(selected => ({...selected, type: "CHARACTER"})));
                }
            })
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
        _setMostRecentSize(getSettingsValue(LOCAL_STORAGE_KEYS.MOST_RECENT_SPELLS_LIST_SIZE));
        _setGridScalingFactor(getSettingsValue(LOCAL_STORAGE_KEYS.GRID_SCALING_FACTOR));
        _setAnimationRate(getSettingsValue(LOCAL_STORAGE_KEYS.ANIMATION_UPDATE_RATE));
        setKeepTargets(getSettingsValue(LOCAL_STORAGE_KEYS.KEEP_SELECTED_TARGETS));
        setDefaultCaster(getSettingsValue(LOCAL_STORAGE_KEYS.DEFAULT_CASTER));
    }, []);

    useEffect(() => {
        if (!obr.ready || !obr.sceneReady) {
            return;
        }
        getGlobalSettingsValue(GLOBAL_STORAGE_KEYS.PLAYERS_CAN_CAST_SPELLS).then(value => setPlayersCastSpells(value as boolean));
        getGlobalSettingsValue(GLOBAL_STORAGE_KEYS.SUMMONED_ENTITIES_RULE).then(value => setSummonedEntities(value as string));
    }, [obr.ready, obr.sceneReady]);

    useEffect(() => {
        if (!obr.ready || !obr.sceneReady) {
            return;
        }
        const handler = OBR.scene.grid.onChange(grid => {
            const parsedGridScale = parseGridScale(grid.scale);
            setGridScale(parsedGridScale);
        });
        OBR.scene.grid.getScale().then(scale => setGridScale(scale));

        return handler;
    }, [obr.ready, obr.sceneReady]);

    useEffect(() => {
        if (mostRecentSize == null) {
            return;
        }
        if (isNaN(mostRecentSize) || mostRecentSize <= 0) {
            setSettingsValue(LOCAL_STORAGE_KEYS.MOST_RECENT_SPELLS_LIST_SIZE, null);
            return;
        }
        setSettingsValue(LOCAL_STORAGE_KEYS.MOST_RECENT_SPELLS_LIST_SIZE, mostRecentSize);
    }, [mostRecentSize]);

    useEffect(() => {
        if (gridScalingFactor == null || isNaN(gridScalingFactor) || gridScalingFactor <= 0) {
            setSettingsValue(LOCAL_STORAGE_KEYS.GRID_SCALING_FACTOR, null);
            return;
        }
        setSettingsValue(LOCAL_STORAGE_KEYS.GRID_SCALING_FACTOR, gridScalingFactor);
    }, [gridScalingFactor]);

    useEffect(() => {
        if (keepTargets == null) {
            return;
        }
        setSettingsValue(LOCAL_STORAGE_KEYS.KEEP_SELECTED_TARGETS, keepTargets);
    }, [keepTargets]);

    useEffect(() => {
        if (defaultCaster == null) {
            return;
        }
        setSettingsValue(LOCAL_STORAGE_KEYS.DEFAULT_CASTER, defaultCaster);
    }, [defaultCaster]);

    useEffect(() => {
        if (animationRate == null) {
            return;
        }
        if (isNaN(animationRate) || animationRate <= 0) {
            setSettingsValue(LOCAL_STORAGE_KEYS.ANIMATION_UPDATE_RATE, null);
            return;
        }
        setSettingsValue(LOCAL_STORAGE_KEYS.ANIMATION_UPDATE_RATE, animationRate);
    }, [animationRate]);

    useEffect(() => {
        if (playersCastSpells == null) {
            return;
        }
        setGlobalSettingsValue(GLOBAL_STORAGE_KEYS.PLAYERS_CAN_CAST_SPELLS, playersCastSpells);
    }, [playersCastSpells]);

    useEffect(() => {
        if (summonedEntities == null) {
            return;
        }
        setGlobalSettingsValue(GLOBAL_STORAGE_KEYS.SUMMONED_ENTITIES_RULE, summonedEntities);
    }, [summonedEntities]);

    return <div ref={mainDiv}>
        <Typography
            mb={"0.5rem"}
            variant="h6"
            className="title spellbook-options"
        >
            Settings
        </Typography>
        <div className="settings-menu">
            <div>
                <p className="subtitle" title="These settings apply to you only.">Local Settings</p>
                <div className="settings-item" title="If set, the first target for some spells will be one of these token, when applicable.">
                    <label>
                        <p>Default caster</p>
                    </label>
                    <div style={{maxWidth: "15rem"}}>
                        <Button
                            onClick={() => openModal("choose-caster-type")}
                            variant="outlined"
                            color="primary"
                        >
                            {
                                (defaultCaster == null || defaultCaster.length == 0) ?
                                "Select" :
                                defaultCaster.map(image => image.name).join(", ")
                            }
                        </Button>
                    </div>
                </div>
                <div className="settings-item">
                    <label htmlFor="grid-scaling-factor" title="A scaling factor for effects; a spell's width and height will be multiplied by this number. Useful if your grid size is not 5ft">
                        <p>Grid scaling factor</p>
                    </label>
                    <input
                        name="grid-scaling-factor"
                        min="0"
                        step="0.1"
                        type="number"
                        placeholder={(tryComputeGridScaling(gridScale) ?? 1).toString()}
                        className="settings-input"
                        value={gridScalingFactor ?? ""}
                        onChange={event => setGridScalingFactor(event.target.value)}
                    />
                </div>
                <div className="settings-item" title="Whether to keep the selected targets the same after a spell is cast/the tool is de-selected.">
                    <label htmlFor="recent-spells-list-size">
                        <p>Keep selected targets</p>
                    </label>
                    <Checkbox checked={keepTargets ?? false} onChange={(event) => {setKeepTargets(event.currentTarget.checked)}} />
                </div>
                <div className="settings-item">
                    <label htmlFor="recent-spells-list-size" title="The size of the recent spells list.">
                        <p>Recent spells list size</p>
                    </label>
                    <input
                        name="recent-spells-list-size"
                        min="0"
                        type="number"
                        className="settings-input"
                        value={mostRecentSize ?? ""}
                        onChange={event => setMostRecentSize(event.target.value)}
                    />
                </div>
                <div className="settings-item">
                    <label htmlFor="animation-update-rate" title="How many updates (per second) are performed when animating items. WARNING: setting this to a high value may lag your computer.">
                        <p>Animation update rate</p>
                    </label>
                    <input
                        name="animation-update-rate"
                        min="0"
                        type="number"
                        className="settings-input"
                        value={animationRate ?? ""}
                        onChange={event => setAnimationRate(event.target.value)}
                    />
                </div>
            </div>
            {
                obr.player?.role === "GM" && <>
                    <hr style={{margin: "0.5rem 0"}}></hr>
                    <div>
                        <p className="subtitle" title="These settings apply to all players and can only be set by the GM.">GM Settings</p>
                        <div className="settings-item">
                            <label htmlFor="recent-spells-list-size" title="If set to false, only the GM can cast spells.">
                                <p>Players can cast spells</p>
                            </label>
                            <Checkbox checked={playersCastSpells ?? false} onChange={(event)=>{setPlayersCastSpells(event.currentTarget.checked)}} />
                        </div>
                        <div className="settings-item" title={"Who should own items summoned by Embers. \"Caster\" means the player who cast the spell will own them, while \"GM\" means that the GM will own them regardless of who cast it."}>
                            <label htmlFor="recent-spells-list-size">
                                <p>Summoned entities rule</p>
                            </label>
                            <select className="settings-select" onChange={event => setSummonedEntities(event.target.value)} value={summonedEntities ?? ""} >
                                <option value="gm-only">GM Only</option>
                                <option value="caster">Caster</option>
                            </select>
                        </div>
                    </div>
                </>
            }
        </div>
        <ReactModal
            isOpen={modalOpened === "choose-caster-type"}
            onRequestClose={closeModal}
            overlayClassName={`modal-overlay ${
                isModalClosing ? "fade-out" : ""
            }`}
            className={`modal-content wide ${isModalClosing ? "fade-out" : ""}`}
            appElement={mainDiv.current!}
        >
            <div style={{textAlign: "left"}}>
                <p>
                    Please choose from one or more of your assets, or choose "Use Selected"
                    to use your currently selected tokens.
                </p>
                <p>
                    <span className="bold">Selected</span>:
                    {
                        " " + (defaultCaster == null || defaultCaster.length == 0 ? "None" : defaultCaster.map(image => image.name).join(", "))
                    }
                </p>
                <br></br>
                <div style={{display: "flex", flexDirection: "column", gap: "0.5rem"}}>
                    <Button
                        onClick={() => { handleAssetPicker(); closeModal(); }}
                        variant="outlined"
                        color="primary"
                    >
                        Open Assets
                    </Button>
                    <Button
                        onClick={() => { handleSetCasterFromSelection(); closeModal(); }}
                        variant="outlined"
                        color="primary"
                    >
                        Use Selected
                    </Button>
                    <Button
                        onClick={() => { setDefaultCaster([]); closeModal(); }}
                        variant="outlined"
                        color="primary"
                    >
                        Clear Selection
                    </Button>
                </div>
            </div>
        </ReactModal>
    </div>;
}
