import "./SpellPopover.css";

import { effectNames, getEffect } from "../effects";
import { toolID, toolMetadataSelectedSpell } from "../targetTool";
import { useEffect, useState } from "react";

import { APP_KEY } from "../config";
import OBR from "@owlbear-rodeo/sdk";
import { useOBR } from "../react-obr/providers";

const MAX_RECENT_EFFECTS = 5;
export const spellPopoverId = `${APP_KEY}/spell-popover`;
export const mostRecentEffectsMetadataKey = `${APP_KEY}/most-recent-effects`;

async function selectEffect(effectName: string) {
    // Update recent spells list
    const mostRecentEffectsList = (await getMostRecentEffects()).filter(
        name => name != effectName
    );
    mostRecentEffectsList.splice(0, 0, effectName);
    if (mostRecentEffectsList.length > MAX_RECENT_EFFECTS) {
        mostRecentEffectsList.pop();
    }
    await OBR.player.setMetadata({ [mostRecentEffectsMetadataKey]: mostRecentEffectsList });

    // Set selected effect
    await OBR.tool.setMetadata(
        toolID, 
        { [toolMetadataSelectedSpell]: effectName }
    );

    // Close this popover
    await OBR.popover.close(spellPopoverId);
}

function checkForEscape(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.code === "Escape") {
        OBR.popover.close(spellPopoverId);
    }
}

async function getMostRecentEffects() {
    const metadata = await OBR.player.getMetadata();
    if (metadata == undefined) {
        return [];
    }
    const mostRecentEffectsList = metadata[mostRecentEffectsMetadataKey];
    if (!Array.isArray(mostRecentEffectsList) || mostRecentEffectsList.length == 0) {
        return [];
    }
    return mostRecentEffectsList as string[];
}

async function getSortedEffectList() {
    const mostRecentEffectsList = await getMostRecentEffects();
    const effectNamesWithoutMostRecent = effectNames.filter(name => !mostRecentEffectsList.includes(name));
    return mostRecentEffectsList.concat(effectNamesWithoutMostRecent);
}

function normalizeSearch(str: string) {
    return str.toLowerCase().replaceAll("_", " ").replaceAll(".", " ");
}

export default function SpellPopover() {
    const obr = useOBR();
    const [search, setSearch] = useState("");
    const [sortedEffectsList, setSortedEffectsList] = useState<string[]>([]);

    useEffect(() => {
        if (!obr.ready || !obr.sceneReady) {
            return;
        }

        getSortedEffectList().then(list => setSortedEffectsList(list));
    }, [obr.ready, obr.sceneReady]);

    if (!obr.ready) {
        return null;
    }

    return <div className="spell-popover" onKeyDown={checkForEscape}>
            <div className="search-container">
                <input type="text" className="search-input" placeholder="Type to search..." autoFocus value={search} onChange={event => setSearch(event.target.value)} />
                <ul className="results-list">
                    {
                        sortedEffectsList.length > 0 &&
                        <li onClick={() => selectEffect(sortedEffectsList[0])} className="selected">
                            <img src={`${window.location.origin}/Library/${getEffect(sortedEffectsList[0])?.thumbnail}`} loading="lazy" />
                            <p className="spell-name">{ sortedEffectsList[0] }</p>
                        </li>
                    }
                    {
                        sortedEffectsList.slice(1).filter(name => normalizeSearch(name).includes(normalizeSearch(search))).map(effectName => {
                            const effect = getEffect(effectName);
                            return <li key={effectName} onClick={() => selectEffect(effectName)}>
                                <img src={`${window.location.origin}/Library/${effect?.thumbnail}`} loading="lazy" />
                                <p className="spell-name">{ effectName }</p>
                            </li>;
                        })
                    }
                </ul>
            </div>
    </div>;
}
