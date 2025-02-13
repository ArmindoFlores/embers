import { useEffect, useState } from "react";

/* eslint-disable react-refresh/only-export-components */
import { APP_KEY } from "../config";
import Checkbox from "./Checkbox";
import OBR from "@owlbear-rodeo/sdk";
import { useOBR } from "../react-obr/providers";
import { Typography } from "@mui/material";

export const LOCAL_STORAGE_KEYS = {
    MOST_RECENT_SPELLS_LIST_SIZE: "most-recent-list",
    KEEP_SELECTED_TARGETS: "keep-selected-targets",
};

export const GLOBAL_STORAGE_KEYS = {
    PLAYERS_CAN_CAST_SPELLS: "players-cast-spells",
    SUMMONED_ENTITIES_RULE: "summoned-entities"
};

const DEFAULT_VALUES = {
    [LOCAL_STORAGE_KEYS.MOST_RECENT_SPELLS_LIST_SIZE]: 10,
    [LOCAL_STORAGE_KEYS.KEEP_SELECTED_TARGETS]: true,
    [GLOBAL_STORAGE_KEYS.PLAYERS_CAN_CAST_SPELLS]: true,
    [GLOBAL_STORAGE_KEYS.SUMMONED_ENTITIES_RULE]: "caster",
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

    const [mostRecentSize, setMostRecentSize] = useState<number|null>(null);
    const [keepTargets, setKeepTargets] = useState<boolean|null>(null);
    const [playersCastSpells, setPlayersCastSpells] = useState<boolean|null>(null);
    const [summonedEntities, setSummonedEntities] = useState<string|null>(null);

    useEffect(() => {
        setMostRecentSize(getSettingsValue(LOCAL_STORAGE_KEYS.MOST_RECENT_SPELLS_LIST_SIZE));
        setKeepTargets(getSettingsValue(LOCAL_STORAGE_KEYS.KEEP_SELECTED_TARGETS));
    }, []);

    useEffect(() => {
        if (!obr.ready || !obr.sceneReady) {
            return;
        }
        getGlobalSettingsValue(GLOBAL_STORAGE_KEYS.PLAYERS_CAN_CAST_SPELLS).then(value => setPlayersCastSpells(value as boolean));
        getGlobalSettingsValue(GLOBAL_STORAGE_KEYS.SUMMONED_ENTITIES_RULE).then(value => setSummonedEntities(value as string));
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
        if (keepTargets == null) {
            return;
        }
        setSettingsValue(LOCAL_STORAGE_KEYS.KEEP_SELECTED_TARGETS, keepTargets);
    }, [keepTargets]);

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
                        onChange={event => setMostRecentSize(parseInt(event.target.value))}
                    />
                </div>
                <div className="settings-item" title="Whether to keep the selected targets the same after a spell is cast/the tool is de-selected.">
                    <label htmlFor="recent-spells-list-size">
                        <p>Keep selected targets</p>
                    </label>
                    <Checkbox checked={keepTargets ?? false} setChecked={setKeepTargets} />
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
