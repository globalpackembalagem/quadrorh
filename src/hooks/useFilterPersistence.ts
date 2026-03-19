import { useState, useCallback } from 'react';

/**
 * Hook para persistir filtros no sessionStorage.
 * Os filtros são mantidos durante a sessão de navegação.
 */
export function useFilterPersistence<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const storageKey = `filter_${key}`;

  const [value, setValue] = useState<T>(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setPersistedValue = useCallback((newValue: T) => {
    setValue(newValue);
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(newValue));
    } catch {
      // sessionStorage pode estar cheio ou indisponível
    }
  }, [storageKey]);

  return [value, setPersistedValue];
}
