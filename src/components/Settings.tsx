import OBR, { GridScale, ImageDownload } from "@owlbear-rodeo/sdk";
import { useCallback, useEffect, useState } from "react";

/* eslint-disable react-refresh/only-export-components */
import { APP_KEY } from "../config";
import AssetPicker from "./AssetPicker";
import Checkbox from "./Checkbox";
import { Typography } from "@mui/material";
import { useOBR } from "../react-obr/providers";

export const LOCAL_STORAGE_KEYS = {
    MOST_RECENT_SPELLS_LIST_SIZE: "most-recent-list",
    GRID_SCALING_FACTOR: "grid-scaling-factor",
    KEEP_SELECTED_TARGETS: "keep-selected-targets",
    DEFAULT_CASTER: "default-caster",
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
    [GLOBAL_STORAGE_KEYS.PLAYERS_CAN_CAST_SPELLS]: true,
    [GLOBAL_STORAGE_KEYS.SUMMONED_ENTITIES_RULE]: "caster",
}

const GRID_UNIT_FACTORS: Record<string, number> = {
    "ft": 1,
    "m": 1.524,
}

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
    const [defaultCaster, setDefaultCaster] = useState<ImageDownload[]|null>(null);

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

    useEffect(() => {
        _setMostRecentSize(getSettingsValue(LOCAL_STORAGE_KEYS.MOST_RECENT_SPELLS_LIST_SIZE));
        _setGridScalingFactor(getSettingsValue(LOCAL_STORAGE_KEYS.GRID_SCALING_FACTOR));
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

    return <div>
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
                    <AssetPicker
                        style={{ height: "1.4rem" }}
                        value={defaultCaster ?? []}
                        setValue={setDefaultCaster}
                        multiple
                    />
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
                    <Checkbox checked={keepTargets ?? false} setChecked={setKeepTargets} />
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
                            <Checkbox checked={playersCastSpells ?? false} setChecked={setPlayersCastSpells} />
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
    </div>;
}
