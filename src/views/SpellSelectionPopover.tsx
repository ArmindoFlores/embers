import "./SpellSelectionPopover.css";

import { LOCAL_STORAGE_KEYS, getSettingsValue } from "../components/Settings";
import { getSpell, spellIDs } from "../effects/spells";
import { toolID, toolMetadataSelectedSpell } from "../effectsTool";
import { useEffect, useState } from "react";

import { APP_KEY } from "../config";
import OBR from "@owlbear-rodeo/sdk";
import { useOBR } from "../react-obr/providers";

export const spellPopoverId = `${APP_KEY}/spell-popover`;
export const mostRecentEffectsMetadataKey = `${APP_KEY}/most-recent-effects`;

async function selectSpell(spellName: string) {
    // Update recent spells list
    const mostRecentSpellsList = (await getMostRecentSpells()).filter(
        name => name != spellName
    );
    mostRecentSpellsList.splice(0, 0, spellName);
    if (mostRecentSpellsList.length > getSettingsValue(LOCAL_STORAGE_KEYS.MOST_RECENT_SPELLS_LIST_SIZE)) {
        mostRecentSpellsList.pop();
    }
    await OBR.player.setMetadata({ [mostRecentEffectsMetadataKey]: mostRecentSpellsList });

    // Set selected effect
    OBR.player.setMetadata(
        { [toolMetadataSelectedSpell]: spellName }
    );
    OBR.tool.setMetadata(
        toolID,
        { [toolMetadataSelectedSpell]: spellName }
    );

    // Close this popover
    await OBR.popover.close(spellPopoverId);
}

function checkForEscape(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.code === "Escape") {
        OBR.popover.close(spellPopoverId);
    }
}

async function getMostRecentSpells() {
    const metadata = await OBR.player.getMetadata();
    if (metadata == undefined) {
        return [];
    }
    const mostRecentSpellsList = metadata[mostRecentEffectsMetadataKey];
    if (!Array.isArray(mostRecentSpellsList) || mostRecentSpellsList.length == 0) {
        return [];
    }
    return mostRecentSpellsList as string[];
}

// async function getSortedEffectList() {
//     const mostRecentEffectsList = await getMostRecentEffects();
//     const effectNamesWithoutMostRecent = effectNames.filter(name => !mostRecentEffectsList.includes(name));
//     return mostRecentEffectsList.concat(effectNamesWithoutMostRecent);
// }

async function getSortedSpellsList() {
    const mostRecentSpellsList = await getMostRecentSpells();
    const effectNamesWithoutMostRecent = spellIDs.filter(name => !mostRecentSpellsList.includes(name));
    return mostRecentSpellsList.concat(effectNamesWithoutMostRecent);
}

function normalizeSearch(str: string) {
    return str.toLowerCase().replaceAll("_", " ").replaceAll(".", " ");
}

function EffectsList({ searchString, sortedSpellsList } : { searchString: string, sortedSpellsList: string[] }) {
    const mostRecentSpell = sortedSpellsList.length > 0 ? getSpell(sortedSpellsList[0]) : undefined;
    return <ul className="results-list">
        {
            mostRecentSpell &&
            <li onClick={() => selectSpell(sortedSpellsList[0])} className="selected">
                <img src={`${window.location.origin}/${mostRecentSpell.thumbnail}`} loading="lazy" />
                <p className="spell-name">{ mostRecentSpell.name }</p>
            </li>
        }
        {
            sortedSpellsList.slice(1).filter(name => normalizeSearch(name).includes(normalizeSearch(searchString))).map(spellName => {
                // const effect = getEffect(spellName);
                const spell = getSpell(spellName);
                return <li key={spellName} onClick={() => selectSpell(spellName)}>
                    <img src={`${window.location.origin}/${spell?.thumbnail}`} loading="lazy" />
                    <p className="spell-name">{ spell?.name || spellName }</p>
                </li>;
            })
        }
    </ul>;
}

export default function SpellSelectionPopover() {
    const obr = useOBR();
    const [search, setSearch] = useState("");
    const [sortedSpellsList, setSortedSpellsList] = useState<string[]>([]);

    useEffect(() => {
        if (!obr.ready || !obr.sceneReady) {
            return;
        }

        // getSortedEffectList().then(list => setSortedSpellsList(list));
        getSortedSpellsList().then(list => setSortedSpellsList(list));
    }, [obr.ready, obr.sceneReady]);

    if (!obr.ready) {
        return null;
    }

    return <div className="popover-container">
        <div className="spell-popover blurry-background" onKeyDown={checkForEscape}>
            <div className="search-container">
                <input type="text" className="search-input" placeholder="Type to search..." autoFocus value={search} onChange={event => setSearch(event.target.value)} />
                <EffectsList sortedSpellsList={sortedSpellsList} searchString={search} />
            </div>
        </div>
        <div className="filler" onClick={() => OBR.popover.close(spellPopoverId)} />
    </div>;
}
