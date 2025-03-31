/* eslint @typescript-eslint/no-explicit-any: 0 */

interface MessageData {
    duration: number;
    id: string;
}

const workerFunction = function () {
    // function log_info(...data: any[]) {
    //     console.log(
    //         "%cEmbers 🔥%c (WORKER)",
    //         "background:purple;border-radius:9999px;color:#fff;padding:3px 7px;font-weight:bold;",
    //         "font-weight: bold",
    //         ...data
    //     );
    // }

    self.onmessage = (event: MessageEvent) => {
        const messageData = event.data as MessageData;
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
