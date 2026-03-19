// Re-export from CDN wrapper for backward compatibility

export async function loadXLSX(): Promise<any> {
  const mod = await import('@/lib/xlsx-cdn-wrapper');
  return mod.default || mod;
}

// Helper to convert Excel serial number to date object
export function excelSerialToDate(serial: number): { y: number; m: number; d: number } | null {
  if (!Number.isFinite(serial) || serial <= 0) return null;
  const excelEpoch = Date.UTC(1899, 11, 30);
  const date = new Date(excelEpoch + Math.floor(serial) * 24 * 60 * 60 * 1000);
  if (Number.isNaN(date.getTime())) return null;
  return {
    y: date.getUTCFullYear(),
    m: date.getUTCMonth() + 1,
    d: date.getUTCDate(),
  };
}
