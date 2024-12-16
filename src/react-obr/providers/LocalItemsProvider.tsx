import OBR, { Item } from "@owlbear-rodeo/sdk";
import React, { createContext, useContext, useEffect, useState } from "react";

import { useCache } from "../hooks";

interface LocalItemsContextType {
    items: Item[];
    changedItems: string[];
    clearChangedItems: () => void;
};

const LocalItemsContext = createContext<LocalItemsContextType>({ items: [], changedItems: [], clearChangedItems: () => {} });
export const useLocalItems = () => useContext(LocalItemsContext);

function hashItem(item: Item) {
    return item.id;
}

function compareItems(a: Item, b: Item) {
    return a.lastModified === b.lastModified;
}

export function LocalItemsProvider({ children }: { children: React.ReactNode }) {
    const { changed, updateElements, clearChanged } = useCache<Item>(hashItem, compareItems);
    const [items, _setItems] = useState<Item[]>([]);
    const [changedItems, setChangedItems] = useState<string[]>([]);

    useEffect(() => {
        return OBR.scene.local.onChange(data => {
            _setItems(data);
            updateElements(data);
        });
    }, []);

    useEffect(() => {
        OBR.scene.local.getItems().then(data => {
            _setItems(data);
            updateElements(data);
        });
    }, []);

    useEffect(() => {
        setChangedItems(Array.from(changed));
    }, [changed]);

    return <LocalItemsContext.Provider value={{items, changedItems, clearChangedItems: clearChanged}}>
        { children }
    </LocalItemsContext.Provider>;
}
