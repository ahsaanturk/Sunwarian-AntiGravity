const STORAGE_KEY_TIME_OFFSET = 'rozadaar_time_offset';
let isSyncedInSession = false;

export interface TimeSyncResult {
  networkTime: number;
  offset: number;
}

export const getStoredOffset = (): number => {
  const stored = localStorage.getItem(STORAGE_KEY_TIME_OFFSET);
  return stored ? parseFloat(stored) : 0;
};

export const saveOffset = (offset: number) => {
  localStorage.setItem(STORAGE_KEY_TIME_OFFSET, offset.toString());
};

export const isTimeSynced = () => isSyncedInSession;

/**
 * Fetches accurate time from multiple public APIs.
 */
export const syncTimeWithNetwork = async (): Promise<TimeSyncResult | null> => {
  if (!navigator.onLine) return null;

  const startTime = Date.now();

  // 1. Try fetching from own server headers first (fastest & reliable for same-origin)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    // HEAD request to root or index.html
    const response = await fetch('/', {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const serverDateStr = response.headers.get('date');
    if (serverDateStr) {
      const networkTime = new Date(serverDateStr).getTime();
      const endTime = Date.now();
      // HTTP Date header only has second precision.
      // We assume the server time represents the moment the request was processed.
      const offset = networkTime - endTime;

      saveOffset(offset);
      isSyncedInSession = true;
      // console.log(`Verified Network Time (Header). Offset: ${offset}ms`);
      return { networkTime, offset };
    }
  } catch (e) {
    // Ignore and try next method
  }

  const services = [
    // Corrected URL case for TimeAPI
    { url: 'https://timeapi.io/api/Time/current/zone?timeZone=UTC', key: 'dateTime' },
    { url: 'https://worldtimeapi.org/api/timezone/Etc/UTC', key: 'datetime' }
  ];

  for (const service of services) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

      const response = await fetch(service.url, {
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const endTime = Date.now();
        const latency = (endTime - startTime) / 2;

        let timeStr = data[service.key];
        // Ensure TimeAPI string is treated as UTC if it lacks 'Z'
        if (service.url.includes('timeapi.io') && !timeStr.endsWith('Z') && !timeStr.includes('+')) {
          timeStr += 'Z';
        }

        const networkTime = new Date(timeStr).getTime() + latency;
        const offset = networkTime - endTime;

        saveOffset(offset);
        isSyncedInSession = true;
        // console.log(`Verified Network Time (${service.url}). Offset: ${offset}ms`);
        return { networkTime, offset };
      }
    } catch (e) {
      // console.warn(`Sync failed for ${service.url}`);
    }
  }

  console.warn('All time sync methods failed. Using device time.');
  return null;
};

/**
 * Returns the corrected Date object.
 */
export const getTrueDate = (): Date => {
  const offset = getStoredOffset();
  return new Date(Date.now() + offset);
};

/**
 * Returns YYYY-MM-DD string based on the user's LOCAL time (not UTC).
 * This fixes the issue where 'today' shows as 'yesterday' between 12 AM and 5 AM in PKT (GMT+5).
 */
export const getLocalDateString = (): string => {
  const date = getTrueDate();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};