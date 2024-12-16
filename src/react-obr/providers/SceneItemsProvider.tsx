import OBR, { Item } from "@owlbear-rodeo/sdk";
import React, { createContext, useContext, useEffect, useState } from "react";

import { useCache } from "../hooks";
import { useOBR } from "./BaseOBRProvider";

interface SceneItemsContextType {
    items: Item[];
    changedItems: string[];
    clearChangedItems: () => void;
}

const SceneItemsContext = createContext<SceneItemsContextType>({ items: [], changedItems: [], clearChangedItems: () => {} });
export const useSceneItems = () => useContext(SceneItemsContext);

function hashItem(item: Item) {
    return item.id;
}

function compareItems(a: Item, b: Item) {
    return a.lastModified === b.lastModified;
}

export function SceneItemsProvider({ children }: { children: React.ReactNode }) {
    const { ready } = useOBR();
    const { changed, updateElements, clearChanged } = useCache<Item>(hashItem, compareItems);
    const [items, _setItems] = useState<Item[]>([]);
    const [changedItems, setChangedItems] = useState<string[]>([]);

    useEffect(() => {
        if (!ready) return;
        return OBR.scene.items.onChange(data => {
            _setItems(data);
            updateElements(data);
        });
    }, [updateElements, ready]);

    useEffect(() => {
        if (!ready) return;
        OBR.scene.items.getItems().then(data => {
            _setItems(data);
            updateElements(data);
        });
    }, [updateElements, ready]);

    useEffect(() => {
        setChangedItems(Array.from(changed));
    }, [changed]);

    return <SceneItemsContext.Provider value={{items, changedItems, clearChangedItems: clearChanged}}>
        { children }
    </SceneItemsContext.Provider>;
}
