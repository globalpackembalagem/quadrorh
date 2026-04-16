// Local wrapper for xlsx-js-style
// Uses locally installed package instead of CDN to avoid network/firewall blocks

import XLSX from 'xlsx-js-style/dist/xlsx.bundle.js';

export default XLSX;
export const read = XLSX.read;
export const write = XLSX.write;
export const writeFile = XLSX.writeFile;
export const writeFileXLSX = XLSX.writeFileXLSX;
export const utils = XLSX.utils;
export const SSF = XLSX.SSF;
export const version = XLSX.version;
