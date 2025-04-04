import { InteractionRecord } from "./types/misc";

export { };

declare global {
    interface Window {
        embersWorker: Worker;
        interactionRecord: InteractionRecord;
    }
}
