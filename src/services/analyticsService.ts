import { AppSettings } from '../types';

const API_TRACK_URL = '/api/analytics/track';
const STORAGE_KEY_VISITOR_ID = 'rozadaar_visitor_id';
const SESSION_KEY_TRACKED = 'rozadaar_session_tracked';

export const getVisitorId = (): string => {
    let id = localStorage.getItem(STORAGE_KEY_VISITOR_ID);
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(STORAGE_KEY_VISITOR_ID, id);
    }
    return id;
};

export const trackVisit = async (settings: AppSettings) => {
    // Prevent duplicate tracking per session (refresh protection)
    if (sessionStorage.getItem(SESSION_KEY_TRACKED)) return;

    const visitorId = getVisitorId();
    const isInstalled = (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone);

    // Simple platform detection
    let platform = 'Web';
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) platform = 'Android';
    else if (/iPad|iPhone|iPod/.test(ua)) platform = 'iOS';
    else if (/windows/i.test(ua)) platform = 'Windows';
    else if (/macintosh/i.test(ua)) platform = 'Mac';

    const payload = {
        visitorId,
        isInstalled,
        platform,
        locationId: settings.selectedLocationId,
        language: settings.language,
        isNewSession: true,
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        referrer: document.referrer || 'Direct'
    };

    try {
        const response = await fetch(API_TRACK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            sessionStorage.setItem(SESSION_KEY_TRACKED, 'true');
        }
    } catch (error) {
        console.error("Tracking error:", error);
    }
};

export const fetchAnalytics = async () => {
    const response = await fetch('/api/analytics/stats');
    if (!response.ok) throw new Error("Failed to fetch stats");
    return await response.json();
};

export const fetchUserDetail = async (visitorId: string) => {
    const response = await fetch(`/api/analytics/user/${visitorId}`);
    if (!response.ok) throw new Error("Failed to fetch user details");
    return await response.json();
};

export const fetchUserList = async (page: number = 1, limit: number = 20, filter?: string, period?: string) => {
    const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
    });
    if (filter) params.append('filter', filter);
    if (period) params.append('period', period);

    const response = await fetch(`/api/analytics/users?${params}`);
    if (!response.ok) throw new Error("Failed to fetch user list");
    return await response.json();
};
