import React, { useState, useEffect, useMemo } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { TRANSLATIONS, INITIAL_MASTER_DATA, ADMIN_ROUTE, GLOBAL_ADMIN_ROUTE, REMOTE_DATA_URL, REMOTE_NOTES_URL, WHATSAPP_NUMBER, DEFAULT_WHATSAPP_COMMUNITY, DUAS } from './constants';
import { getStoredData, saveStoredData, getSettings, saveSettings, getStoredNotes, saveStoredNotes } from './services/storageService';
import { RamadanTiming, Language, AppSettings, LocationData, Note } from './types';
import { requestNotificationPermission, playAlarm } from './services/notificationService';
import { prefetchAudio } from './services/audioService';
import { syncTimeWithNetwork, getTrueDate, isTimeSynced } from './services/timeService';

// Components
import Countdown from './components/Countdown';
import AdminPanel from './components/AdminPanel';
import GlobalAdminPanel from './components/GlobalAdminPanel';
import Calendar from './components/Calendar';
import DuaSlider from './components/DuaSlider';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import LocationModal from './components/LocationModal';



/**
 * Helper to convert 24h string "HH:MM" to 12h format "hh:mm AM/PM"
 */
export const formatTo12h = (time24: string | undefined): string => {
    if (!time24 || time24 === '--:--') return '--:--';
    const [h, m] = time24.split(':');
    const hours = parseInt(h);
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${h12.toString().padStart(2, '0')}:${m} ${suffix}`;
};

const App = () => {
    return (
        <HashRouter>
            <MainApp />
        </HashRouter>
    );
};

const MainApp = () => {
    const [masterData, setMasterData] = useState<LocationData[]>(INITIAL_MASTER_DATA);
    const [notesData, setNotesData] = useState<Note[]>([]);
    const [settings, setSettings] = useState<AppSettings>(getSettings());
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isLocalAdminOpen, setIsLocalAdminOpen] = useState(false);
    const [isGlobalAdminOpen, setIsGlobalAdminOpen] = useState(false);
    const [currentTime, setCurrentTime] = useState(getTrueDate());
    const [timeIsVerified, setTimeIsVerified] = useState(isTimeSynced());

    // Modal States
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const t = TRANSLATIONS[settings.language];
    const location = useLocation();
    const navigate = useNavigate();

    const activeLocation = masterData.find(l => l.id === settings.selectedLocationId) || masterData[0];
    const activeTimings = activeLocation.timings;

    // Dynamic settings from Location Data
    const activeWhatsApp = activeLocation.whatsapp_number || WHATSAPP_NUMBER;
    const activeMessage = activeLocation.custom_message;
    const activeCommunity = activeLocation.whatsapp_community || DEFAULT_WHATSAPP_COMMUNITY;

    // Filter Notes: Global OR Matches Current Location (Sorted: Local first)
    const visibleNotes = useMemo(() => {
        return notesData
            .filter(note => note.isGlobal || note.locationId === settings.selectedLocationId)
            .sort((a, b) => {
                if (a.isGlobal === b.isGlobal) return 0;
                return a.isGlobal ? 1 : -1;
            });
    }, [notesData, settings.selectedLocationId]);

    const performTimeSync = async () => {
        const res = await syncTimeWithNetwork();
        if (res) {
            setCurrentTime(getTrueDate());
            setTimeIsVerified(true);
        }
    };

    const checkConnectivity = async () => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000); // Fail fast after 2 seconds

            // Using a timestamp to bypass cache and ensure real network verification
            const res = await fetch(`/?nocache=${Date.now()}`, {
                method: 'HEAD',
                cache: 'no-store',
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const online = res.ok;
            setIsOnline(online);
            return online;
        } catch (e) {
            setIsOnline(false);
            return false;
        }
    };

    useEffect(() => {
        const handleOnline = () => checkConnectivity();
        const handleOffline = () => setIsOnline(false);
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') checkConnectivity();
        };
        const handleFocus = () => checkConnectivity();

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);

        setMasterData(getStoredData());
        setNotesData(getStoredNotes());

        // Initial check
        checkConnectivity().then(online => {
            if (online) {
                performTimeSync();
                // Prefetch Dua Audio for Offline Use
                prefetchAudio(DUAS.sehri.arabic, 'sehri_dua');
                prefetchAudio(DUAS.iftar.arabic, 'iftar_dua');
            }
        });

        const clockTimer = setInterval(() => {
            setCurrentTime(getTrueDate());
        }, 1000);

        // Aggressive "Heartbeat" (Every 2 Seconds)
        const connectivityInterval = setInterval(() => {
            checkConnectivity();
        }, 2000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
            clearInterval(clockTimer);
            clearInterval(connectivityInterval);
        };
    }, []);

    const performDataSync = async () => {
        if (!settings.autoSync || !navigator.onLine) return;

        try {
            // Fetch Locations
            const locRes = await fetch(REMOTE_DATA_URL);
            if (locRes.ok) {
                const remoteMaster: LocationData[] = await locRes.json();
                if (Array.isArray(remoteMaster) && remoteMaster.length > 0) {
                    // Only update if data changed
                    if (JSON.stringify(remoteMaster) !== JSON.stringify(masterData)) {
                        setMasterData(remoteMaster);
                        saveStoredData(remoteMaster);

                        // Update Sync Time
                        const now = getTrueDate();
                        const syncRef = `${now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' })}`;
                        // We use a functional state update for settings to avoid dependency loops if we put settings in dependency array of this function
                        setSettings(prev => {
                            const newSettings = { ...prev, lastSyncTime: syncRef };
                            saveSettings(newSettings);
                            return newSettings;
                        });
                    }
                }
            }

            // Fetch Notes
            const noteRes = await fetch(REMOTE_NOTES_URL);
            if (noteRes.ok) {
                const remoteNotes: Note[] = await noteRes.json();
                if (Array.isArray(remoteNotes)) {
                    // Only update if data changed
                    if (JSON.stringify(remoteNotes) !== JSON.stringify(notesData)) {
                        setNotesData(remoteNotes);
                        saveStoredNotes(remoteNotes);
                    }
                }
            }
        } catch (err) {
            console.log('Background Sync failed:', err);
        }
    };

    // Initial Sync + Reconnect Sync
    useEffect(() => {
        if (settings.autoSync && isOnline) {
            performDataSync();
        }
    }, [settings.autoSync, isOnline]);

    // Periodic Background Sync (Every 1 Minute)
    useEffect(() => {
        if (!settings.autoSync) return;

        const syncInterval = setInterval(() => {
            if (navigator.onLine) {
                performDataSync();
            }
        }, 1000); // 1 Second

        return () => clearInterval(syncInterval);
    }, [settings.autoSync]);

    useEffect(() => {
        if (location.pathname === ADMIN_ROUTE) setIsLocalAdminOpen(true);
        else if (location.pathname === GLOBAL_ADMIN_ROUTE) setIsGlobalAdminOpen(true);
    }, [location]);

    // PWA Install Logic
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Check if running in standalone mode
        const checkStandalone = () => {
            const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
            setIsStandalone(!!isStandaloneMode);
        };

        checkStandalone();
        window.matchMedia('(display-mode: standalone)').addEventListener('change', checkStandalone);

        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setInstallPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.matchMedia('(display-mode: standalone)').removeEventListener('change', checkStandalone);
        };
    }, []);

    const handleInstallClick = () => {
        if (installPrompt) {
            installPrompt.prompt();
            installPrompt.userChoice.then((choiceResult: any) => {
                if (choiceResult.outcome === 'accepted') {
                    setInstallPrompt(null);
                }
            });
        } else {
            // Fallback: Show manual instructions (e.g., for iOS)
            setIsInstallModalOpen(true);
        }
    };

    // Wake Lock Logic
    const [isWakeLockActive, setIsWakeLockActive] = useState(false);
    const wakeLockRef = React.useRef<any>(null);

    useEffect(() => {
        const requestWakeLock = async () => {
            if (settings.wakeLockEnabled && 'wakeLock' in navigator) {
                try {
                    wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
                    setIsWakeLockActive(true);
                    wakeLockRef.current.addEventListener('release', () => {
                        setIsWakeLockActive(false);
                    });
                } catch (err) {
                    console.log('Wake Lock failed:', err);
                }
            }
        };

        const releaseWakeLock = async () => {
            if (wakeLockRef.current) {
                await wakeLockRef.current.release();
                wakeLockRef.current = null;
                setIsWakeLockActive(false);
            }
        };

        const handleVisibilityChange = async () => {
            if (settings.wakeLockEnabled && document.visibilityState === 'visible') {
                await requestWakeLock();
            }
        };

        if (settings.wakeLockEnabled) {
            requestWakeLock();
            document.addEventListener('visibilitychange', handleVisibilityChange);
        } else {
            releaseWakeLock();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        }

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            releaseWakeLock();
        };
    }, [settings.wakeLockEnabled]);

    const toggleLanguage = () => {
        const newLang: Language = settings.language === 'en' ? 'ur' : 'en';
        const newSettings = { ...settings, language: newLang };
        setSettings(newSettings);
        saveSettings(newSettings);
    };

    const checkNotificationPermission = async () => {
        if (!settings.notificationsEnabled) {
            await requestNotificationPermission();
        }
        setIsNotificationModalOpen(true);
    };

    const handleSettingsUpdate = (newSettings: AppSettings) => {
        setSettings(newSettings);
        saveSettings(newSettings);
    };

    const selectLocation = (id: string) => {
        handleSettingsUpdate({ ...settings, selectedLocationId: id });
        setIsLocationModalOpen(false);
        setSearchQuery('');
    };

    // Filter Locations Logic (Flexible Search)
    const filteredLocations = useMemo(() => {
        if (!searchQuery) return masterData;
        const lowerQuery = searchQuery.toLowerCase().trim();
        return masterData.filter(loc =>
            loc.name_en.toLowerCase().includes(lowerQuery) ||
            loc.name_ur.includes(lowerQuery) ||
            loc.id.toLowerCase().includes(lowerQuery)
        );
    }, [masterData, searchQuery]);

    // Derived state that updates every second with currentTime
    const todayStr = currentTime.toISOString().split('T')[0];
    const todayData = activeTimings.find(d => d.date === todayStr);

    const alertOptions = [
        { label: t.timeOption2Hours, value: 120 },
        { label: t.timeOption1Hour, value: 60 },
        { label: t.timeOption30Min, value: 30 },
        { label: t.timeOption20Min, value: 20 },
        { label: t.timeOption10Min, value: 10 },
        { label: t.timeOptionOff, value: 0 },
    ];

    return (
        <div className={`min-h-screen font-sans text-gray-800 bg-slate-100 ${settings.language === 'ur' ? 'font-urdu' : ''}`} dir={settings.language === 'ur' ? 'rtl' : 'ltr'}>

            {/* Header */}
            <Header
                settings={settings}
                activeLocation={activeLocation}
                currentTime={currentTime}
                timeIsVerified={timeIsVerified}
                onToggleLanguage={toggleLanguage}
                translation={t}
            />

            <main className="max-w-md mx-auto -mt-16 px-4 relative z-20 pb-40">
                <Routes>
                    <Route path="/" element={
                        <>
                            <Countdown timings={activeTimings} translation={t} settings={settings} />
                            <DuaSlider language={settings.language} timings={activeTimings} currentTime={currentTime} />
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                                        <i className="fas fa-cloud-moon text-lg"></i>
                                    </div>
                                    <p className="text-xs text-gray-500 font-bold uppercase">{t.sehri}</p>
                                    <p className="text-lg font-bold text-gray-800 font-mono mt-1">{formatTo12h(todayData?.sehri)}</p>
                                </div>
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                                    <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center mb-2">
                                        <i className="fas fa-sun text-lg"></i>
                                    </div>
                                    <p className="text-xs text-gray-500 font-bold uppercase">{t.iftar}</p>
                                    <p className="text-lg font-bold text-gray-800 font-mono mt-1">{formatTo12h(todayData?.iftar)}</p>
                                </div>
                            </div>

                            {/* Custom Announcement Message from Admin (TOP PRIORITY) */}
                            {activeMessage && (
                                <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl shadow-sm mb-4 text-center animate-pulse-slow">
                                    <div className="flex items-center justify-center gap-2 mb-1 text-emerald-800">
                                        <i className="fas fa-bullhorn text-xs"></i>
                                        <h3 className="font-bold text-xs uppercase tracking-wider">{settings.language === 'ur' ? 'اعلان' : 'Announcement'}</h3>
                                    </div>
                                    <p className={`text-sm text-emerald-700 font-medium whitespace-pre-line leading-relaxed ${settings.language === 'ur' ? 'font-urdu' : ''}`}>
                                        {activeMessage[settings.language] || activeMessage.en || activeMessage.ur}
                                    </p>
                                </div>
                            )}

                            {/* NOTES SECTION (Global + Location) - Compact Story Points */}
                            {visibleNotes.length > 0 && (
                                <div className="mb-6 px-2">
                                    <ul className="space-y-2">
                                        {visibleNotes.map(note => (
                                            <li key={note.id} className="flex gap-3 text-sm text-gray-700 bg-white p-3 rounded-xl shadow-sm border border-gray-100 items-start">
                                                <i className={`fas fa-circle text-[6px] mt-2 flex-shrink-0 ${note.isGlobal ? 'text-gray-300' : 'text-emerald-500'}`}></i>
                                                <span className={`leading-relaxed font-medium ${settings.language === 'ur' ? 'font-urdu' : ''}`}>
                                                    {note.text[settings.language] || note.text.en || note.text.ur}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </>
                    } />
                    <Route path="/calendar" element={<Calendar data={activeTimings} translation={t} language={settings.language} />} />
                    <Route path="/settings" element={
                        <div className="space-y-4 mt-4">
                            <div className="flex justify-end mb-2">
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold shadow-sm border transition-all ${isOnline ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                    <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                                    {isOnline ? t.online : t.offline}
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                <p className={`font-bold text-gray-800 mb-3 ${settings.language === 'ur' ? 'font-urdu-heading' : ''}`}>{t.selectLocation}</p>

                                {/* Custom Selector Trigger */}
                                <div
                                    onClick={() => setIsLocationModalOpen(true)}
                                    className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors group"
                                >
                                    <span className="font-bold text-gray-700 group-hover:text-emerald-700">
                                        {settings.language === 'ur' ? activeLocation.name_ur : activeLocation.name_en}
                                    </span>
                                    <i className="fas fa-chevron-down text-gray-400 group-hover:text-emerald-500"></i>
                                </div>
                            </div>

                            {/* PWA: Install App Button (Visible if NOT standalone) */}
                            {!isStandalone && (
                                <button
                                    onClick={handleInstallClick}
                                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-5 rounded-2xl shadow-lg shadow-emerald-200 flex justify-between items-center transform transition-transform active:scale-[0.98]"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl backdrop-blur-sm">
                                            <i className="fas fa-download"></i>
                                        </div>
                                        <span className={`font-bold text-lg ${settings.language === 'ur' ? 'font-urdu-heading' : ''}`}>{t.installAppBtn}</span>
                                    </div>
                                    <i className="fas fa-chevron-right text-emerald-100"></i>
                                </button>
                            )}

                            {/* PWA: Wake Lock Toggle */}
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-colors ${settings.wakeLockEnabled ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'}`}>
                                        <i className="fas fa-sun"></i>
                                    </div>
                                    <div>
                                        <p className={`font-bold text-gray-800 text-lg ${settings.language === 'ur' ? 'font-urdu-heading' : ''}`}>{t.keepScreenOn}</p>
                                    </div>
                                </div>

                                <div
                                    className={`w-12 h-7 rounded-full relative cursor-pointer transition-colors ${settings.wakeLockEnabled ? 'bg-amber-500' : 'bg-gray-300'}`}
                                    onClick={() => handleSettingsUpdate({ ...settings, wakeLockEnabled: !settings.wakeLockEnabled })}
                                >
                                    <div className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full transition-transform shadow-sm ${settings.wakeLockEnabled ? 'translate-x-5' : ''}`}></div>
                                </div>
                            </div>

                            {/* Notification Settings Button */}
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center cursor-pointer active:bg-gray-50 transition-colors" onClick={checkNotificationPermission}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${settings.notificationsEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}><i className="fas fa-bell"></i></div>
                                    <div>
                                        <p className={`font-bold text-gray-800 text-lg ${settings.language === 'ur' ? 'font-urdu-heading' : ''}`}>{t.notificationsSetting}</p>
                                    </div>
                                </div>
                                <i className="fas fa-chevron-right text-gray-300"></i>
                            </div>

                            {/* WhatsApp Support Button */}
                            <a href={`https://wa.me/${activeWhatsApp}`} target="_blank" rel="noopener noreferrer" className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center text-gray-700">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xl"><i className="fab fa-whatsapp"></i></div>
                                    <span className={`font-bold text-lg ${settings.language === 'ur' ? 'font-urdu-heading' : ''}`}>{t.whatsappSupport}</span>
                                </div>
                                <i className="fas fa-external-link-alt text-gray-300 text-xs"></i>
                            </a>

                            {/* WhatsApp Community Button */}
                            <a href={activeCommunity} target="_blank" rel="noopener noreferrer" className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center text-gray-700">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center text-xl"><i className="fas fa-users"></i></div>
                                    <span className={`font-bold text-lg ${settings.language === 'ur' ? 'font-urdu-heading' : ''}`}>{t.whatsappCommunity}</span>
                                </div>
                                <i className="fas fa-external-link-alt text-gray-300 text-xs"></i>
                            </a>

                            <div className="pt-4 text-center">
                                <Link to={ADMIN_ROUTE} className="text-gray-400 text-xs py-2 px-6 rounded-full border border-gray-200">
                                    <i className="fas fa-lock mr-2"></i>{t.adminLogin}
                                </Link>
                            </div>
                        </div>
                    } />
                </Routes>
            </main>

            {/* Location Selection Modal */}
            <LocationModal
                isOpen={isLocationModalOpen}
                onClose={() => setIsLocationModalOpen(false)}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                filteredLocations={filteredLocations}
                settings={settings}
                onSelectLocation={selectLocation}
                translation={t}
            />

            {/* Notifications Settings Modal */}
            {isNotificationModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsNotificationModalOpen(false)}></div>
                    <div className="relative bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up z-10">
                        <div className="w-full flex justify-center pt-3 pb-2 bg-white flex-shrink-0 cursor-pointer" onClick={() => setIsNotificationModalOpen(false)}>
                            <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
                        </div>

                        <div className="p-6 pb-10">
                            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <i className="fas fa-bell text-emerald-600"></i>
                                {t.notificationsSetting}
                            </h2>

                            {/* Master Toggle */}
                            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex justify-between items-center mb-6">
                                <div>
                                    <p className="font-bold text-emerald-900">{t.enableNotifications}</p>
                                </div>
                                <div
                                    className={`w-12 h-7 rounded-full relative cursor-pointer transition-colors ${settings.notificationsEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
                                    onClick={() => handleSettingsUpdate({ ...settings, notificationsEnabled: !settings.notificationsEnabled })}
                                >
                                    <div className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full transition-transform shadow-sm ${settings.notificationsEnabled ? 'translate-x-5' : ''}`}></div>
                                </div>
                            </div>

                            {/* Alert Configurations */}
                            {settings.notificationsEnabled && (
                                <div className="space-y-4 animate-slide-up">
                                    {/* Sehri Config */}
                                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2 text-blue-600">
                                                <i className="fas fa-cloud-moon"></i>
                                                <span className="font-bold">{t.sehriAlertTime}</span>
                                            </div>
                                            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-md font-bold">{t.preAlertLabel}</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            {alertOptions.map((opt) => (
                                                <button
                                                    key={`sehri-${opt.value}`}
                                                    onClick={() => handleSettingsUpdate({ ...settings, sehriAlertOffset: opt.value })}
                                                    className={`text-xs py-2 px-1 rounded-lg border transition-all font-medium ${settings.sehriAlertOffset === opt.value ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Iftar Config */}
                                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2 text-orange-500">
                                                <i className="fas fa-sun"></i>
                                                <span className="font-bold">{t.iftarAlertTime}</span>
                                            </div>
                                            <span className="text-xs bg-orange-50 text-orange-600 px-2 py-1 rounded-md font-bold">{t.preAlertLabel}</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            {alertOptions.map((opt) => (
                                                <button
                                                    key={`iftar-${opt.value}`}
                                                    onClick={() => handleSettingsUpdate({ ...settings, iftarAlertOffset: opt.value })}
                                                    className={`text-xs py-2 px-1 rounded-lg border transition-all font-medium ${settings.iftarAlertOffset === opt.value ? 'bg-orange-500 text-white border-orange-500 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'}`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <nav className="fixed bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md border border-white/50 rounded-2xl shadow-lg p-2 z-50 flex justify-around">
                <Link to="/" className={`flex flex-col items-center w-full py-2 rounded-xl ${location.pathname === '/' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400'}`}>
                    <i className="fas fa-home text-xl mb-1"></i>
                    <span className="text-[10px] font-bold">{t.dashboard}</span>
                </Link>
                <Link to="/calendar" className={`flex flex-col items-center w-full py-2 rounded-xl ${location.pathname === '/calendar' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400'}`}>
                    <i className="fas fa-calendar-alt text-xl mb-1"></i>
                    <span className="text-[10px] font-bold">{t.calendar}</span>
                </Link>
                <Link to="/settings" className={`flex flex-col items-center w-full py-2 rounded-xl ${location.pathname === '/settings' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400'}`}>
                    <i className="fas fa-cog text-xl mb-1"></i>
                    <span className="text-[10px] font-bold">{t.settings}</span>
                </Link>
            </nav>

            {isLocalAdminOpen && (
                <AdminPanel
                    data={activeTimings}
                    onUpdate={(newData) => {
                        const newMaster = masterData.map(l => l.id === settings.selectedLocationId ? { ...l, timings: newData } : l);
                        setMasterData(newMaster);
                        saveStoredData(newMaster);
                    }}
                    translation={t} settings={settings} onUpdateSettings={handleSettingsUpdate}
                    onClose={() => { setIsLocalAdminOpen(false); navigate('/settings'); }}
                />
            )}

            {isGlobalAdminOpen && (
                <GlobalAdminPanel
                    data={masterData}
                    onUpdate={(m) => { setMasterData(m); saveStoredData(m); }}
                    notes={notesData}
                    onUpdateNotes={(n) => { setNotesData(n); saveStoredNotes(n); }}
                    translation={t}
                    onClose={() => { setIsGlobalAdminOpen(false); navigate('/'); }}
                />
            )}

            {/* iOS / Manual Install Instructions Modal */}
            {isInstallModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsInstallModalOpen(false)}></div>
                    <div className="relative bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-slide-up">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className={`text-xl font-bold text-gray-800 ${settings.language === 'ur' ? 'font-urdu-heading' : ''}`}>
                                {t.installModalTitle}
                            </h3>
                            <button onClick={() => setIsInstallModalOpen(false)} className="text-gray-400 hover:text-red-500">
                                <i className="fas fa-times-circle text-2xl"></i>
                            </button>
                        </div>

                        <p className="text-gray-600 mb-6 text-sm">{t.installModalDesc}</p>

                        {/* Check if iOS (iPhone/iPad/iPod) */}
                        {/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream ? (
                            // iOS Specific Instructions
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <i className="fas fa-share-square text-blue-500 text-2xl"></i>
                                    <div>
                                        <p className="font-bold text-gray-800 text-sm">{t.installModalStep1}</p>
                                        <p className="text-xs text-gray-500">{t.iosShareIcon}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <i className="fas fa-plus-square text-gray-700 text-2xl"></i>
                                    <div>
                                        <p className="font-bold text-gray-800 text-sm">{t.installModalStep2}</p>
                                        <p className="text-xs text-gray-500">{t.iosAddIcon}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // Generic / Android / Desktop Instructions
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <i className="fas fa-ellipsis-v text-gray-700 text-2xl px-2"></i>
                                    <div>
                                        <p className="font-bold text-gray-800 text-sm">{t.genericInstallStep1}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <i className="fas fa-download text-emerald-600 text-2xl"></i>
                                    <div>
                                        <p className="font-bold text-gray-800 text-sm">{t.genericInstallStep2}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-6 text-center">
                            <button
                                onClick={() => setIsInstallModalOpen(false)}
                                className="text-emerald-600 font-bold text-sm"
                            >
                                {t.close}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;