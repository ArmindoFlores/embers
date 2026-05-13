import { InteractionRecord } from "./types/misc";

export { };

declare global {
    interface Window {
        interactionRecord: InteractionRecord;
    }
}
