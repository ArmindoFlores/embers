/* eslint @typescript-eslint/no-explicit-any: 0 */

export function log_info(...data: any[]) {
    console.log("%cMagic Missiles 🪄", "background:purple;border-radius:9999px;color:#fff;padding:3px 7px;font-weight:bold;", ...data);
}

export function log_warn(...data: any[]) {
    console.warn("%cMagic Missiles 🪄", "background:purple;border-radius:9999px;color:#fff;padding:3px 7px;font-weight:bold;", ...data);
}

export function log_error(...data: any[]) {
    console.error("%cMagic Missiles 🪄", "background:purple;border-radius:9999px;color:#fff;padding:3px 7px;font-weight:bold;", ...data);
}
