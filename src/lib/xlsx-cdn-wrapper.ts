// CDN wrapper for xlsx-js-style
// Loads from CDN to avoid "Cannot access 'G' before initialization" errors

const CDN_URL = "https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/+esm";

const mod = await import(/* @vite-ignore */ CDN_URL);
const XLSX = mod.default || mod;

export default XLSX;
export const read = XLSX.read;
export const write = XLSX.write;
export const writeFile = XLSX.writeFile;
export const writeFileXLSX = XLSX.writeFileXLSX;
export const utils = XLSX.utils;
export const SSF = XLSX.SSF;
export const version = XLSX.version;
