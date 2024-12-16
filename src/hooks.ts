import { useCallback, useEffect, useRef } from "react";

export type ThrottleTypes = "leading" | "trailing" | "both";

export function useThrottled<F extends (...args: any[]) => R, R>(fn: F, delay: number, type: ThrottleTypes = "both") {
    const timeoutRef = useRef<number>();
    const timestampRef = useRef<number>();

    const throttledFunc = useCallback((...args: Parameters<F>) => {
        const now = (new Date()).getTime();
        if ((type == "both" || type == "leading") && (timestampRef.current === undefined || now - timestampRef.current > delay)) {
            fn(...args);
        }
        else if (type == "both" || type == "trailing") {
            if (timeoutRef.current !== undefined) { 
                clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = setTimeout(() => {
                fn(...args);
                cleanup();
            }, delay);
        }
        timestampRef.current = now;
    }, [fn, delay]);

    const cleanup = () => {
        timestampRef.current = undefined;
        if (timeoutRef.current !== undefined) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = undefined;
        }
    };

    useEffect(() => {
        return cleanup;
    }, []);

    return throttledFunc;
}

export function arrayEqual<T>(arr1: T[], arr2: T[]): boolean {
    if (arr1.length !== arr2.length) return false;
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) return false;
    }
    return true;
}

export function useArrayCompareMemoize<V>(value: V[]): V[] {
    const ref = useRef<V[]>([]);

    if (!arrayEqual(ref.current, value)) {
        ref.current = value;
    }

    return ref.current;
}
