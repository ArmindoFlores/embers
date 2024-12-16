/* eslint @typescript-eslint/no-explicit-any: 0 */

interface MessageData {
    duration: number;
    id: string;
}

const workerFunction = function () {
    function log_info(...data: any[]) {
        console.log("%c[Magic Missile 🪄]", "font-weight: bold; color: purple", ...data);
    }
    
    self.onmessage = (event: MessageEvent) => {
        const messageData = event.data as MessageData;
        log_info(`Scheduling update in ${messageData.duration} for ${messageData.id}`);
        setTimeout(() => {
            postMessage(messageData.id);
        }, messageData.duration);
    };
};
    
const codeToString = workerFunction.toString();
const mainCode = codeToString.substring(codeToString.indexOf("{") + 1, codeToString.lastIndexOf("}"));
const blob = new Blob([mainCode], { type: "application/javascript" });
const workerScript = URL.createObjectURL(blob);

export default workerScript;