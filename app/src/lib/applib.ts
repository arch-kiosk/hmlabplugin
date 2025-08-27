//@ts-ignore
import { FetchException } from "../../../../../static/scripts/kioskapputils.js";
//@ts-ignore
import { MessageData, MSG_NETWORK_ERROR, MSG_LOGGED_OUT, sendMessage } from "./appmessaging";
import { LitElement } from "lit-element";
import { DateTime } from "luxon";
import { AnyDict } from "./hmlabtypes";
import { ContextRoot } from "@lit-labs/context";
import rgba from "color-rgba";

export const JOB_STATUS_GHOST = 0;
export const JOB_STATUS_REGISTERED = 1;
export const JOB_STATUS_SUSPENDED = 5;
export const JOB_STATUS_STARTED = 8;
export const JOB_STATUS_RUNNING = 10;
export const JOB_STATUS_CANCELLING = 15;
export const JOB_STATUS_DONE = 20;
export const JOB_STATUS_CANCELED = 21;
export const JOB_STATUS_ABORTED = 22;

const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max)

export type RGBColor = [number, number, number]
export type RGBAColor = [number, number, number, number]


export function inDevelopmentMode() {
    // @ts-ignore
    // noinspection JSUnresolvedReference
    return (import.meta.env.VITE_MODE == "DEVELOPMENT");
}

export function log(obj: any) {
    // @ts-ignore
    // noinspection JSUnresolvedReference
    if (import.meta.env.VITE_MODE == "DEVELOPMENT") console.log(obj);
}

//This is just to create a small somewhat unique number from a string for debugging purposes.
//using https://stackoverflow.com/a/7616484/11150752 as a template
export function dumbHashCode(s: string) {
    let hash = 0,
        i, chr;
    // if (s.length === 0) return s;
    for (i = 0; i < s.length; i++) {
        chr = s.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return [...hash.toString()].filter((c, index) => index % 2 > 0).join("");
}

export function getSqlDate(date: Date): string {
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
}

export function fromSqlDate(date: string): Date {
    const parts = date.split("-");
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

// export function getRecordTypeNames(constants: Array<Constant>): {[key:string]: string} {
//     let result: {[key:string]: string} = {}
//
//     for (let i=0;i<constants.length;i++) {
//         let constant = constants[i]
//         try {
//             if (constant["path"] === "file_repository/recording_context_aliases") {
//                 result[constant.key] = constant.value
//             }
//         } catch (e) {
//             console.log(e)
//             console.log(constant)
//         }
//     }
//
//     return result
// }
//
// export function recordType2Name(recordTypeNames: {[key:string]: string}, recordType: string): string {
//     if (recordTypeNames && recordType in recordTypeNames) {
//         return recordTypeNames[recordType]
//     } else return recordType
// }
//
// export function name2RecordType(recordTypeNames: {[key:string]: string}, name: string): string {
//     if (recordTypeNames) {
//         const recordTypes = Object.keys(recordTypeNames)
//         for (let i = 0; i < recordTypes.length; i++) {
//             if (recordTypeNames[recordTypes[i]] === name) return recordTypes[i]
//         }
//     }
//     return ""
// }

export function handleCommonFetchErrors(handlerInstance: LitElement,
                                        e: FetchException, messagePrefix = "",
                                        onUnhandledError: CallableFunction = null) {
    if (messagePrefix) messagePrefix += ": ";
    if (e.response) {
        if (e.response.status == 403 || e.response.status == 401) {
            sendMessage(handlerInstance, MSG_NETWORK_ERROR,
                `${messagePrefix}You are not logged in properly or your session has timed out`,
                `<a href="/logout">Please log in again.</a>`);
            return;
        }

        if (onUnhandledError) {
            onUnhandledError(e);
        } else {
            sendMessage(handlerInstance, MSG_NETWORK_ERROR,
                `${messagePrefix}Kiosk server responded with an error.`, `(${e.msg}). 
                The server might be down or perhaps you are not logged in properly.`);
        }

    } else {
        sendMessage(handlerInstance, MSG_NETWORK_ERROR,
            `${messagePrefix}Kiosk server responded with a network error.`, `(${e}). 
            The server might be down or perhaps you are not logged in properly.`);
        return;
    }
}

export function gotoPage(href: string): void {

    // @ts-ignore
    if (import.meta.env.VITE_MODE == "DEVELOPMENT") {
        href = "http://localhost:5000" + href;
    }
    window.location.href = href;
}


/**
 * Calculate a 32 bit FNV-1a hash
 * Found here: https://stackoverflow.com/a/22429679/11150752 (CC BY-SA 4.0)
 * Ref 1: https://gist.github.com/vaiorabbit/5657561
 * Ref 2: http://isthe.com/chongo/tech/comp/fnv/
 *
 */
export function fowlerNollVo1aHashModern(str: string, offset = 0x811c9dc5, prime = 0x01000193): number {
    let hashValue = offset;

    for (let i = 0; i < str.length; i++) {
        hashValue ^= str.charCodeAt(i);
        hashValue = Math.imul(hashValue, prime);
    }

    return hashValue >>> 0;
}

export function safeLocaleCompare(d1: string | undefined, d2: string | undefined) {
    if (!d1 && d2) return 1;
    if (d1 && !d2) return -1;
    if (!d1 && !d2) return 0;
    return String(d1).localeCompare(String(d2));
}

export function compareISODateTime(d1: string | undefined, d2: string | undefined): number {
    if (!d1 && d2) return (1);
    if (d1 && !d2) return (-1);
    if (!d1 && !d2) return (0);

    const ld1 = DateTime.fromISO(d1);
    const ld2 = DateTime.fromISO(d2);

    if (ld1 < ld2)
        return -1;
    if (ld1 > ld2)
        return 1;

    return 0;


}

export function FMDictToDict(FMDict: string): AnyDict {
    const lines = FMDict.split("\r");
    const rc: { [key: string]: string } = {};
    let key, value: string;
    for (const line of lines) {
        [key, value] = line.split("=");
        if (key && value) {
            rc[key] = value;
        } else {
            return undefined;
        }
    }
    return rc;
}

export function getLatinDate(dt: DateTime, withTime: boolean = true): string {
    const latinMonths = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
    const dtStr = `${dt.day}.${latinMonths[dt.month - 1]}.${dt.year}`;
    return withTime ? dtStr + " " + dt.toLocaleString(DateTime.TIME_SIMPLE) : dtStr;
}

export function getCSSVar(varName1: string, element?: Element, varName2?: string): string {
    let rootStyles: CSSStyleDeclaration;

    if (element) {
        rootStyles = window.getComputedStyle(element);
    } else {
        rootStyles = window.getComputedStyle(document.body);
    }
    let result = undefined
    if (rootStyles) {
        result = rootStyles.getPropertyValue(varName1)
        if (!result && varName2)
            result = rootStyles.getPropertyValue(varName2)
    }
    return result
}

export function getCSSVarColor(varName1: string, element?: HTMLElement, varName2?: string): RGBAColor {
    let v = getCSSVar(varName1, element, varName2);

    const rgba_value: RGBAColor | [] = v ? rgba(v) : []
    return rgba_value && rgba_value.length === 4 ? rgba_value : undefined;
}

export function RGBToHSB(r: number, g: number, b: number) {
    r /= 255;
    g /= 255;
    b /= 255;
    const v = Math.max(r, g, b),
        n = v - Math.min(r, g, b);
    const h =
        n === 0 ? 0 : n && v === r ? (g - b) / n : v === g ? 2 + (b - r) / n : 4 + (r - g) / n;
    return [60 * (h < 0 ? h + 6 : h), v && (n / v) * 100, v * 100];
}

export function RGBAToHSL(rgba: RGBAColor) {
    let r = rgba[0]/ 255;
    let g = rgba[1] / 255;
    let b = rgba[2] / 255;
    const l = Math.max(r, g, b);
    const s = l - Math.min(r, g, b);
    const h = s
        ? l === r
            ? (g - b) / s
            : l === g
                ? 2 + (b - r) / s
                : 4 + (r - g) / s
        : 0;
    return [
        Math.round(60 * h < 0 ? 60 * h + 360 : 60 * h),
        Math.round(100 * (s ? (l <= 0.5 ? s / (2 * l - s) : s / (2 - (2 * l - s))) : 0)),
        Math.round((100 * (2 * l - s)) / 2),
    ];
}

export function HSLToRGB(h: number, s: number, l: number): RGBColor {
    s /= 100;
    l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) =>
        l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
}


export function HSBToRGB(h: number, s: number, b: number):[number, number, number] {
    s /= 100;
    b /= 100;
    const k = (n: number) => (n + h / 60) % 6;
    const f = (n: number) => b * (1 - s * Math.max(0, Math.min(k(n), 4 - k(n), 1)));
    return [Math.round(255 * f(5)), Math.round(255 * f(3)), Math.round(255 * f(1))];
}

export function increase_brightness(rgbaColor: RGBAColor, percent: number): [number, number, number, number] {
    let hsb = RGBToHSB(rgbaColor[0], rgbaColor[1], rgbaColor[2]);
    hsb[2] = clamp(hsb[2] + hsb[2] * percent / 100,0,100);
    return [...HSBToRGB(hsb[0], hsb[1], hsb[2]),hsb[3]]
}

export function increase_lightness(rgbaColor: RGBAColor, points: number): RGBAColor {
    let hsl = RGBAToHSL(rgbaColor);
    hsl[2] = clamp(hsl[2] + points,0,100);
    return [...HSLToRGB(hsl[0], hsl[1], hsl[2]),rgbaColor[3]]
}

export function RGBToHex(color: [number, number, number, number?]) {
    let r = color[0].toString(16);
    let g = color[1].toString(16);
    let b = color[2].toString(16);

    if (r.length == 1)
        r = "0" + r;
    if (g.length == 1)
        g = "0" + g;
    if (b.length == 1)
        b = "0" + b;

    return "#" + r + g + b;
}

export function RGBAToHexA(color: [number, number, number, number]) {
    let r = color[0].toString(16);
    let g = color[1].toString(16);
    let b = color[2].toString(16);
    let a = Math.round(color[3] * 255).toString(16);

    if (r.length == 1)
        r = "0" + r;
    if (g.length == 1)
        g = "0" + g;
    if (b.length == 1)
        b = "0" + b;
    if (a.length == 1)
        a = "0" + a;

    return "#" + r + g + b + a;
}

export function RGBStrToRGB(rgbStr: string) {
    let rgb = rgbStr.match(/\d+/g).map(Number);
    let rgba: RGBAColor = [0,0,0,1]
    rgb.forEach((col,index) => rgba[index] = col)
    return rgba
}

export function hexToRGB(hex: string): RGBAColor {
    let alpha = false,
        h: any = hex.slice(hex.startsWith('#') ? 1 : 0);
    if (h.length === 3) h = [...h].map(x => x + x).join('');
    else if (h.length === 8) alpha = true;
    h = parseInt(h, 16);
    return RGBStrToRGB('rgb' +
        (alpha ? 'a' : '') +
        '(' +
        (h >>> (alpha ? 24 : 16)) +
        ', ' +
        ((h & (alpha ? 0x00ff0000 : 0x00ff00)) >>> (alpha ? 16 : 8)) +
        ', ' +
        ((h & (alpha ? 0x0000ff00 : 0x0000ff)) >>> (alpha ? 8 : 0)) +
        (alpha ? `, ${h & 0x000000ff}` : '') +
        ')')
}