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
