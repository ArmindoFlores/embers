import OBR from "@owlbear-rodeo/sdk";
import { log_error } from "./logging";

export interface SizedItem {
    image?: {
        width: number;
        height: number;
    }
    scale: {
        x: number;
        y: number;
    }
    grid?: {
        dpi: number;
    }
}

export type EasingFunction = "LINEAR" | "EASE_IN" | "EASE_OUT" | "EASE_IN_OUT" | "EASE_IN_QUAD";

export function getItemSize(item: SizedItem) {
    const gridFactor = (item.image && item.grid) ? Math.max(item.image.width, item.image.height) / item.grid.dpi : 1;
    const scale = Math.max(item.scale.x, item.scale.y) * gridFactor;
    return scale;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadJSONFile(event: React.ChangeEvent<HTMLInputElement>, onComplete: (json: any) => void) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const content = e.target?.result as string;
            const json = JSON.parse(content);
            onComplete(json);

        } catch (error) {
            OBR.notification.show("Error parsing file", "ERROR");
            log_error("Error parsing JSON:", error);
        } finally {
            if (event.target) {
                event.target.value = "";
            }
        }
    };

    reader.onerror = () => {
        OBR.notification.show("Error parsing file", "ERROR");
        log_error("Error loading file");
    };

    reader.readAsText(file);
}

export function downloadFileFromString(content: string, filename: string, MIMEType: string = "text/plain") {
    const blob = new Blob([content], { type: MIMEType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

export function setDifference<T>(a: Set<T>, b: Set<T>): Set<T> {
    return new Set([...a].filter(x => !b.has(x)));
}

function linear(t: number): number {
    return t;
}

function inQuad(t: number): number {
    return t * t;
}

function outQuad(t: number): number {
    return 1 - (1 - t) * (1 - t);
}

function inOutQuad(t: number): number {
    return t < 0.5
        ? 2 * t * t
        : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function getEasingFunction(name: EasingFunction) {
    let easingFunc = easingFunctions.linear;
    switch (name) {
        case "EASE_IN":
            easingFunc = easingFunctions.inQuad;
            break;
        case "EASE_OUT":
            easingFunc = easingFunctions.outQuad;
            break;
        case "EASE_IN_OUT":
            easingFunc = easingFunctions.inOutQuad;
            break;
    }
    return easingFunc;
}

export const easingFunctions = {
    linear,
    inQuad,
    outQuad,
    inOutQuad
};
