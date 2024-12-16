/* eslint @typescript-eslint/no-explicit-any: 0 */

export function log_info(...data: any[]) {
    console.log("%c[Magic Missile 🪄]", "font-weight: bold; color: purple", ...data);
}

export function log_warn(...data: any[]) {
    console.warn("%c[Magic Missile 🪄]", "font-weight: bold; color: purple", ...data);
}

export function log_error(...data: any[]) {
    console.error("%c[Magic Missile 🪄]", "font-weight: bold; color: purple", ...data);
}
