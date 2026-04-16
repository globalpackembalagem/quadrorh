// Local wrapper for xlsx-js-style
// Uses locally installed package bundle directly to avoid CDN/network issues

// @ts-ignore - importing the raw bundle file directly
import XLSX from '../../node_modules/xlsx-js-style/dist/xlsx.bundle.js';

export default XLSX;
export const read = XLSX.read;
export const write = XLSX.write;
export const writeFile = XLSX.writeFile;
export const writeFileXLSX = XLSX.writeFileXLSX;
export const utils = XLSX.utils;
export const SSF = XLSX.SSF;
export const version = XLSX.version;
