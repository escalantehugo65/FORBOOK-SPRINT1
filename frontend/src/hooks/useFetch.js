import { useEffect, useState } from 'react';

// La función loader se memoriza en la página con useCallback.
export function useFetch(loader) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true); setError(null); setResult(null);
    loader(controller.signal).then(value => { if (active) setResult(value); }).catch(error => {
      if (active && error.name !== 'AbortError') setError(error);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [loader, revision]);
  return { result, loading, error, retry: () => setRevision(value => value + 1) };
}
