import { useEffect, useState } from "react";

/**
 * Server-adjusted "now", re-rendering every `tickMs`.
 * `serverNow` is the server's Date.now() from the latest query result; the
 * offset is taken at receipt, so countdowns follow the authoritative clock.
 */
export function useServerClock(serverNow: number | undefined, tickMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const offset = serverNow === undefined ? 0 : serverNow - Date.now();
    const tick = () => setNow(Date.now() + offset);
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, tickMs);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [serverNow, tickMs]);

  return now;
}
