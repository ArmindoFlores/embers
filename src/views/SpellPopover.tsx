import "./SpellPopover.css";

import { effects, getEffect } from "../effects";
import { toolID, toolMetadataSelectedSpell } from "../targetTool";
import { useEffect, useState } from "react";

import { APP_KEY } from "../config";
import { Effect } from "../types/effects";
import OBR from "@owlbear-rodeo/sdk";
import { useOBR } from "../react-obr/providers";

export const spellPopoverId = `${APP_KEY}/spell-popover`;

function selectEffect(effectName: string) {
    OBR.tool.setMetadata(
        toolID, 
        { [toolMetadataSelectedSpell]: effectName }
    ).then(() => OBR.popover.close(spellPopoverId));
}

export default function SpellPopover() {
    const obr = useOBR();
    const [search, setSearch] = useState("");
    const [selectedName, setSelectedName] = useState<string>();
    const [selected, setSelected] = useState<Effect>();

    useEffect(() => {
        if (!obr.ready || !obr.sceneReady) {
            return;
        }

        OBR.tool.getMetadata(toolID).then(metadata => {
            const selected = metadata?.[toolMetadataSelectedSpell] as string|undefined;
            if (selected != undefined) {
                const effect = getEffect(selected);
                if (effect != undefined) {
                    setSelected(effect);
                    setSelectedName(selected);
                }
            }
        });
    }, [obr.ready, obr.sceneReady]);

    if (!obr.ready) {
        return null;
    }

    return <div className="spell-popover">
            <div className="search-container">
                <input type="text" className="search-input" placeholder="Type to search..." autoFocus value={search} onChange={event => setSearch(event.target.value)} />
                <ul className="results-list">
                    {
                        selected && selectedName &&
                        <li onClick={() => selectEffect(selectedName)} className="selected">
                            <img src={`${window.location.origin}/Library/${selected.thumbnail}`} loading="lazy" />
                            <p className="spell-name">{ selectedName }</p>
                        </li>
                    }
                    {
                        Object.entries(effects).filter(([effectName]) => effectName != selectedName && effectName.toLowerCase().includes(search.toLowerCase())).map(([effectName, effect]) => {
                            return <li key={effectName} onClick={() => selectEffect(effectName)}>
                                <img src={`${window.location.origin}/Library/${effect.thumbnail}`} loading="lazy" />
                                <p className="spell-name">{ effectName }</p>
                            </li>;
                        })
                    }
                </ul>
            </div>
    </div>;
}
