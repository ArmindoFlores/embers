import { useReducer, useRef } from "react";

const ADD_CHANGED = "ADD_CHANGED";
const CLEAR_CHANGED = "CLEAR_CHANGED";


function reducer(state: {changed: Set<string>}, action: { type: string, payload?: string[] }): {changed: Set<string>} {
    switch (action.type) {
        case CLEAR_CHANGED:
            return {
                ...state,
                changed: new Set()
            };
        case ADD_CHANGED:
            return {
                ...state,
                changed: new Set([...state.changed, ...action.payload!])
            };
        default:
            return state;
    }
}

export function useCache<T>(hash: (item: T) => string, compare: (a: T, b: T) => boolean = (a, b) => a === b) {
    const cache = useRef<Map<string, T>>(new Map());
    const [changed, dispatch] = useReducer(reducer, { changed: new Set<string>() });

    const updateElement = (key: string, item: T) => {
        const current = cache.current.get(key);
        if (current && compare(item, current)) {
            return;
        }
        cache.current.set(key, item);
        dispatch({ type: ADD_CHANGED, payload: [key] });
    }

    const updateElements = (items: T[]) => {
        const newChanged = new Set<string>();
        items.forEach(item => {
            const key = hash(item);
            const current = cache.current.get(key);
            if (current && compare(item, current)) {
                return;
            }
            cache.current.set(key, item);
            newChanged.add(key);
        });
        dispatch({ type: ADD_CHANGED, payload: Array.from(newChanged) });
    }

    const clearCache = () => {
        cache.current = new Map();
        dispatch({ type: CLEAR_CHANGED });
    }

    const clearChanged = () => {
        dispatch({ type: CLEAR_CHANGED });
    }

    return {
        cache,
        changed: changed.changed,
        updateElement,
        updateElements,
        clearCache,
        clearChanged,
    };
}
