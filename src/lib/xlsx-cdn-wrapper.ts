// Local wrapper for xlsx-js-style.
// The package bundle is UMD, so production builds must load it as a script.

import xlsxBundleUrl from '../../node_modules/xlsx-js-style/dist/xlsx.bundle.js?url';

let loadPromise: Promise<any> | null = null;

function getGlobalXLSX() {
  return (globalThis as any).XLSX;
}

function isValidXLSX(xlsx: any) {
  return !!xlsx?.utils && typeof xlsx.read === 'function' && typeof xlsx.writeFile === 'function';
}

export async function getXLSX(): Promise<any> {
  const current = getGlobalXLSX();
  if (isValidXLSX(current)) return current;

  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-xlsx-js-style="true"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(getGlobalXLSX()));
        existing.addEventListener('error', reject);
        return;
      }

      const script = document.createElement('script');
      script.src = xlsxBundleUrl;
      script.async = true;
      script.dataset.xlsxJsStyle = 'true';
      script.onload = () => resolve(getGlobalXLSX());
      script.onerror = () => reject(new Error('Falha ao carregar biblioteca Excel'));
      document.head.appendChild(script);
    }).then(() => {
      const xlsx = getGlobalXLSX();
      if (!isValidXLSX(xlsx)) throw new Error('Biblioteca Excel carregada sem leitor valido');
      return xlsx;
    });
  }

  return loadPromise;
}

export default getXLSX;
