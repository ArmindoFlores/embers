import "./SceneControls.css";

import { FaArrowPointer, FaEye, FaEyeSlash, FaLink, FaLinkSlash, FaSquareMinus } from "react-icons/fa6";
import OBR, { Item, Player } from "@owlbear-rodeo/sdk";
import { effectMetadataKey, spellMetadataKey } from "../effects/effects";
import { useCallback, useEffect, useState } from "react";

import { MessageType } from "../types/messageListener";
import { Spell } from "../types/spells";
import { getSpell } from "../effects/spells";
import { useOBR } from "../react-obr/providers";

function SpellDisplay({ spellID, item }: { spellID?: string, item: Item }) {
    const [spell, setSpell] = useState<Spell>();

    const selectItem = useCallback(() => {
        OBR.player.select([item.id], false);
    }, [item]);
    
    const toggleItemVisibility = useCallback(() => {
        OBR.scene.items.updateItems([item], items => {
            for (const itemDraft of items) {
                itemDraft.visible = !item.visible;
            }
        });
    }, [item]);

    const toggleItemDisableHit = useCallback(() => {
        OBR.scene.items.updateItems([item], items => {
            for (const itemDraft of items) {
                itemDraft.disableHit = !item.disableHit;
            }
        });
    }, [item]);

    const deleteItem = useCallback(() => {
        OBR.scene.items.deleteItems([item.id]);
    }, [item]);
    
    useEffect(() => {
        if (spellID == undefined) {
            return;
        }
        setSpell(getSpell(spellID));
    }, [spellID]);
    
    if (spell == undefined) {
        return null;
    }
    
    return <div className="scene-spell-display-item">
        <p> { spell.name }</p>
        <div className="scene-spell-display-controls">
            <div className="scene-spell-display-control-button" onClick={selectItem}>
                <FaArrowPointer />
            </div>
            <div className="scene-spell-display-control-button" onClick={toggleItemDisableHit}>
                {
                    item.disableHit ? <FaLinkSlash /> : <FaLink />
                }
            </div>
            <div className="scene-spell-display-control-button" onClick={toggleItemVisibility}>
                {
                    item.visible ? <FaEye /> : <FaEyeSlash />
                }
            </div>
            <div className="scene-spell-display-control-button" onClick={deleteItem}>
                <FaSquareMinus />
            </div>
        </div>
    </div>;
}

export default function SceneControls() {
    const obr = useOBR();
    const [party, setParty] = useState<Player[]>([]);
    const [player, setPlayer] = useState<Player|null>(null);
    const [globalSpellItems, _setGlobalSpellItems] = useState<Item[]>([]);

    const setGlobalSpellItems = useCallback((items: Item[]) => (
        _setGlobalSpellItems(items.filter(item => (
            item.metadata[effectMetadataKey] != undefined || item.metadata[spellMetadataKey] != undefined
        )))
    ), []);

    const PlayerEffects = useCallback(({ player }: { player: Player }) => {
        const playerItems = globalSpellItems.filter(
            item => (
                (item.metadata[spellMetadataKey] as MessageType["spellData"])?.caster === player.id &&
                (item.metadata[spellMetadataKey] as MessageType["spellData"])?.name != undefined
            )
        );

        if (playerItems.length === 0) {
            return null;
        }

        return <div>
            <p className="bold">{ player.name }</p>
            <ul className="scene-spell-list">
                {
                    playerItems.map(item => (
                        <SpellDisplay key={item.id} spellID={(item.metadata[spellMetadataKey] as MessageType["spellData"])?.name} item={item} />
                    ))
                }
            </ul>
        </div>;
    }, [globalSpellItems]);

    useEffect(() => {
        if (!obr.ready || !obr.sceneReady) {
            setParty([]);
            return;
        }
        setParty(obr.party);
    }, [obr.ready, obr.sceneReady, obr.party]);

    useEffect(() => {
        if (!obr.ready || !obr.sceneReady) {
            setPlayer(null);
            return;
        }
        setPlayer(obr.player);
    }, [obr.ready, obr.sceneReady, obr.player]);

    useEffect(() => {
        if (!obr.ready || !obr.sceneReady) {
            return;
        }

        const unmountGlobal = OBR.scene.items.onChange(setGlobalSpellItems);
        OBR.scene.items.getItems().then(globalItems => {
            setGlobalSpellItems(globalItems);
        });

        return () => {
            unmountGlobal();
        }
    }, [obr.ready, obr.sceneReady, setGlobalSpellItems]);

    return <div>
        {
            player ? <>
                <p className="subtitle">Active Effects</p>
                <PlayerEffects player={player} />
                {
                    globalSpellItems.length != 0 ?
                        party.map(player => (
                            <PlayerEffects key={player.id} player={player} />
                        ))
                        :
                        <p>No spell effects in this scene.</p>
                }
            </> : <p>No scene selected.</p>
        }
    </div>;
}
