// Local wrapper for xlsx-js-style.
// The package bundle is UMD, so production builds must load it as a script.

import xlsxBundleUrl from '../../node_modules/xlsx-js-style/dist/xlsx.bundle.js?url';

let loadPromise: Promise<any> | null = null;

function getGlobalXLSX() {
  return (globalThis as any).XLSX;
}

export async function getXLSX(): Promise<any> {
  const current = getGlobalXLSX();
  if (current?.utils) return current;

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
    }).then((xlsx) => {
      if (!xlsx?.utils) throw new Error('Biblioteca Excel carregada sem utilitarios');
      return xlsx;
    });
  }

  return loadPromise;
}

export default getXLSX;
