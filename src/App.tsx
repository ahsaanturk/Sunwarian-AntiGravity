import React, { useState, useEffect, useMemo } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { TRANSLATIONS, INITIAL_MASTER_DATA, ADMIN_ROUTE, GLOBAL_ADMIN_ROUTE, REMOTE_DATA_URL, REMOTE_NOTES_URL, WHATSAPP_NUMBER, DEFAULT_WHATSAPP_COMMUNITY, DUAS, DEFAULT_USER_GUIDE } from './constants';
import { getStoredData, saveStoredData, getSettings, saveSettings, getStoredNotes, saveStoredNotes } from './services/storageService';
import { RamadanTiming, Language, AppSettings, LocationData, Note } from './types';
import { requestNotificationPermission, playAlarm, stopAlarm } from './services/notificationService';
import { prefetchAudio } from './services/audioService';
import { syncTimeWithNetwork, getTrueDate, isTimeSynced, getLocalDateString } from './services/timeService';
import { Analytics } from '@vercel/analytics/react';

// Components
import Countdown from './components/Countdown';
// Lazy Load Admin Panels to reduce initial bundle size
const AdminPanel = React.lazy(() => import('./components/AdminPanel'));
const GlobalAdminPanel = React.lazy(() => import('./components/GlobalAdminPanel'));
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
    const [userGuide, setUserGuide] = useState<string>(''); // Current User Guide Text
    const [settings, setSettings] = useState<AppSettings>(getSettings());
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isLocalAdminOpen, setIsLocalAdminOpen] = useState(false);
    const [isGlobalAdminOpen, setIsGlobalAdminOpen] = useState(false);
    const [currentTime, setCurrentTime] = useState(getTrueDate());
    const [timeIsVerified, setTimeIsVerified] = useState(isTimeSynced());

    // Modal States
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
    const [isUserGuideOpen, setIsUserGuideOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isPlayingAlarm, setIsPlayingAlarm] = useState(false);

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
            .filter(note => (note.isGlobal || note.locationId === settings.selectedLocationId) && note.type !== 'guide')
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

    // Extract User Guide from Notes
    useEffect(() => {
        const guideNote = notesData.find(n => n.type === 'guide');
        const guideText = guideNote
            ? (guideNote.text[settings.language] || guideNote.text.en || guideNote.text.ur)
            : DEFAULT_USER_GUIDE[settings.language];
        setUserGuide(guideText);
    }, [notesData, settings.language]);

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

                // Track Analytics (Once per session)
                import('./services/analyticsService').then(({ trackVisit }) => {
                    trackVisit(settings);
                });
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
        // Validation: Don't sync if offline, disabled, OR ADMIN IS OPEN (Active Editing)
        if (!settings.autoSync || !navigator.onLine || isLocalAdminOpen || isGlobalAdminOpen) return;

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

    // Periodic Background Sync (Every 1 Second)
    useEffect(() => {
        if (!settings.autoSync) return;

        const syncInterval = setInterval(() => {
            if (navigator.onLine) {
                performDataSync();
            }
        }, 1000); // 1 Second Refresh

        return () => clearInterval(syncInterval);
    }, [settings.autoSync, performDataSync]); // Added performDataSync to fix stale closure

    useEffect(() => {
        if (location.pathname === ADMIN_ROUTE) setIsLocalAdminOpen(true);
        else if (location.pathname === GLOBAL_ADMIN_ROUTE) setIsGlobalAdminOpen(true);
    }, [location]);

    // PWA Install Logic
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [expandedInstallOption, setExpandedInstallOption] = useState<string | null>(null);

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
        setExpandedInstallOption(null);
        setIsInstallModalOpen(true);
    };

    const handlePlatformInstall = (platform: string) => {
        if (installPrompt && (platform === 'android' || platform === 'windows')) {
            installPrompt.prompt();
            installPrompt.userChoice.then((choiceResult: any) => {
                if (choiceResult.outcome === 'accepted') {
                    setInstallPrompt(null);
                    setIsInstallModalOpen(false);
                }
            });

            // Delayed fallback to instructions (2 seconds) as requested
            setTimeout(() => {
                setExpandedInstallOption(platform);
            }, 2000);
        } else {
            // Immediate feedback if no prompt or iOS
            setExpandedInstallOption(expandedInstallOption === platform ? null : platform);
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
            loc.id.toLowerCase().includes(lowerQuery) ||
            (loc.nearby_areas && (
                (typeof loc.nearby_areas === 'string' && loc.nearby_areas.toLowerCase().includes(lowerQuery)) ||
                (typeof loc.nearby_areas === 'object' && (
                    (loc.nearby_areas.en && loc.nearby_areas.en.toLowerCase().includes(lowerQuery)) ||
                    (loc.nearby_areas.ur && loc.nearby_areas.ur.includes(lowerQuery))
                ))
            )) ||
            (loc.custom_message?.en && loc.custom_message.en.toLowerCase().includes(lowerQuery)) ||
            (loc.custom_message?.ur && loc.custom_message.ur.includes(lowerQuery))
        );
    }, [masterData, searchQuery]);

    // Derived state that updates every second with currentTime
    const todayStr = getLocalDateString();
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

                            {/* Nearby Areas Disclaimer Note (Home Screen) */}
                            {activeLocation.nearby_areas && (
                                <div className="mb-4 px-2">
                                    <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl shadow-sm text-center">
                                        <p className={`text-xs text-amber-800 font-medium leading-relaxed ${settings.language === 'ur' ? 'font-urdu' : ''}`}>
                                            <i className="fas fa-info-circle mr-1"></i>
                                            {settings.language === 'ur'
                                                ? `یہ کیلنڈر ان علاقوں کے لیے بھی موزوں ہے: ${typeof activeLocation.nearby_areas === 'object' ? (activeLocation.nearby_areas.ur || activeLocation.nearby_areas.en) : activeLocation.nearby_areas}`
                                                : `This Calendar is valid for: ${typeof activeLocation.nearby_areas === 'object' ? (activeLocation.nearby_areas.en || activeLocation.nearby_areas.ur) : activeLocation.nearby_areas}`
                                            }
                                        </p>
                                    </div>
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
                            <div className="flex flex-col items-end mb-2">
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold shadow-sm border transition-all ${timeIsVerified ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                                    <span className={`w-2 h-2 rounded-full ${timeIsVerified ? 'bg-emerald-500 animate-pulse' : 'bg-yellow-500'}`}></span>
                                    {timeIsVerified
                                        ? (settings.language === 'ur' ? 'انٹرنیٹ سے درست وقت حاصل کیا جا رہا ہے' : 'Accurate time fetching from Internet')
                                        : (settings.language === 'ur' ? 'آخری انٹرنیٹ رابطے کی بنیاد پر پیشین گوئی' : 'Predicted based on last internet fetch')
                                    }
                                    <div className="relative group ml-1">
                                        <i className="fas fa-info-circle text-gray-400 cursor-pointer hover:text-emerald-500 transition-colors"></i>
                                        <div className="absolute right-0 top-6 w-64 bg-gray-800 text-white text-[10px] p-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                                            <p className="mb-1 font-bold border-b border-gray-600 pb-1">Time Accuracy / وقت کی درستگی</p>
                                            <p className="mb-1">We synchronize your clock with global internet time to ensure Sehar/Iftar accuracy, even if your device time is wrong.</p>
                                            <p className="font-urdu text-right">ہم آپ کی گھڑی کو عالمی انٹرنیٹ وقت کے ساتھ ہم آہنگ کرتے ہیں تاکہ سحر و افطار کے اوقات درست رہیں، چاہے آپ کے موبائل کا وقت غلط ہو۔</p>
                                        </div>
                                    </div>
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
                            <a href={`https://wa.me/${activeWhatsApp}?text=${encodeURIComponent(t.supportPreFilledMsg)}`} target="_blank" rel="noopener noreferrer" className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center text-gray-700">
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

                            {/* User Guide Button */}
                            <div
                                onClick={() => setIsUserGuideOpen(true)}
                                className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center cursor-pointer active:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl">
                                        <i className="fas fa-book-open"></i>
                                    </div>
                                    <span className={`font-bold text-lg ${settings.language === 'ur' ? 'font-urdu-heading' : ''}`}>{t.userGuideBtn}</span>
                                </div>
                                <i className="fas fa-chevron-right text-gray-300"></i>
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

                            <div className="pt-4 text-center">
                                <Link to={ADMIN_ROUTE} className="text-gray-400 text-xs py-2 px-6 rounded-full border border-gray-200">
                                    <i className="fas fa-lock mr-2"></i>{t.adminLogin}
                                </Link>
                                <div className="mt-8 mb-20 text-center text-gray-400 text-xs space-y-1">
                                    <p className="font-urdu-heading text-sm">طالبِ دعا: ٹیم روزہ دار ایپ</p>
                                    <p className="font-medium opacity-70">Request for Prayers: Team Rozadaar App</p>
                                </div>
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
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-emerald-900">{t.enableNotifications}</p>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (isPlayingAlarm) {
                                                    stopAlarm();
                                                    setIsPlayingAlarm(false);
                                                } else {
                                                    setIsPlayingAlarm(true);
                                                    playAlarm('beep', settings.alarmTone);
                                                    // Start main alarm after 1s beep
                                                    setTimeout(() => {
                                                        if (isPlayingAlarm) { // Check if user hasn't stopped it yet
                                                            playAlarm('alarm', settings.alarmTone);
                                                        }
                                                    }, 1000);

                                                    // Auto-reset state after approx duration
                                                    setTimeout(() => setIsPlayingAlarm(false), 15000);
                                                }
                                            }}
                                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs hover:scale-110 transition-all shadow-sm ${isPlayingAlarm ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-emerald-200 text-emerald-700 hover:bg-emerald-300'}`}
                                            title={isPlayingAlarm ? "Stop Alarm" : "Test Alert Sound"}
                                        >
                                            <i className={`fas ${isPlayingAlarm ? 'fa-stop' : 'fa-play'}`}></i>
                                        </button>
                                    </div>
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
                                    {/* ALARM TONE SELECTOR */}
                                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                        <div className="flex items-center gap-2 text-indigo-600 mb-3">
                                            <i className="fas fa-music"></i>
                                            <span className="font-bold">{t.alarmToneLabel}</span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                            {['digital', 'islamic', 'classic'].map((tone) => (
                                                <button
                                                    key={tone}
                                                    onClick={() => handleSettingsUpdate({ ...settings, alarmTone: tone as any })}
                                                    className={`py-3 px-3 rounded-xl border transition-all font-bold text-xs flex items-center justify-between group ${settings.alarmTone === tone ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-200' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-white hover:border-indigo-300'}`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <i className={`fas ${tone === 'digital' ? 'fa-stopwatch-20' : tone === 'islamic' ? 'fa-mosque' : 'fa-bell'}`}></i>
                                                        <span>{tone === 'digital' ? t.toneDigital : tone === 'islamic' ? t.toneIslamic : t.toneClassic}</span>
                                                    </div>
                                                    {settings.alarmTone === tone && <i className="fas fa-check-circle"></i>}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
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
                <React.Suspense fallback={<div className="fixed inset-0 flex items-center justify-center z-50 bg-white/80 backdrop-blur-sm"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div></div>}>
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
                </React.Suspense>
            )}

            {isGlobalAdminOpen && (
                <React.Suspense fallback={<div className="fixed inset-0 flex items-center justify-center z-50 bg-white/80 backdrop-blur-sm"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>}>
                    <GlobalAdminPanel
                        data={masterData}
                        onUpdate={(m) => { setMasterData(m); saveStoredData(m); }}
                        notes={notesData}
                        onUpdateNotes={(n) => { setNotesData(n); saveStoredNotes(n); }}
                        translation={t}
                        onClose={() => { setIsGlobalAdminOpen(false); navigate('/'); }}
                    />
                </React.Suspense>
            )}

            {/* iOS / Manual Install Instructions Modal */}
            {isInstallModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsInstallModalOpen(false)}></div>
                    <div className="relative bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className={`text-xl font-bold text-gray-800 ${settings.language === 'ur' ? 'font-urdu-heading' : ''}`}>
                                {t.installModalTitle}
                            </h3>
                            <button onClick={() => setIsInstallModalOpen(false)} className="text-gray-400 hover:text-red-500">
                                <i className="fas fa-times-circle text-2xl"></i>
                            </button>
                        </div>
                        {/* ... existing install modal content ... */}
                        <div className="space-y-3">
                            {/* Option 1: Android */}
                            <div className={`border rounded-xl transition-all ${expandedInstallOption === 'android' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white'}`}>
                                <div
                                    onClick={() => handlePlatformInstall('android')}
                                    className="p-4 flex items-center gap-3 cursor-pointer"
                                >
                                    <i className="fab fa-android text-2xl text-emerald-600"></i>
                                    <div className="flex-1">
                                        <p className={`font-bold text-gray-800 ${settings.language === 'ur' ? 'font-urdu' : ''}`}>{t.installAndroid}</p>
                                        <p className="text-xs text-gray-500">{t.installAndroidDesc}</p>
                                    </div>
                                    <i className={`fas fa-chevron-down text-gray-400 transition-transform ${expandedInstallOption === 'android' ? 'rotate-180' : ''}`}></i>
                                </div>
                                {expandedInstallOption === 'android' && (
                                    <div className="px-4 pb-4 animate-slide-up">
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-emerald-100">
                                                <i className="fas fa-ellipsis-v text-gray-500 w-6 text-center"></i>
                                                <p className="text-xs font-medium text-gray-700">{t.installAndroidStep1}</p>
                                            </div>
                                            <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-emerald-100">
                                                <i className="fas fa-download text-emerald-600 w-6 text-center"></i>
                                                <p className="text-xs font-medium text-gray-700">{t.installAndroidStep2}</p>
                                            </div>
                                            <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-emerald-100">
                                                <i className="fas fa-check-circle text-emerald-600 w-6 text-center"></i>
                                                <p className="text-xs font-medium text-gray-700">{t.installAndroidStep3}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Option 2: iOS */}
                            <div className={`border rounded-xl transition-all ${expandedInstallOption === 'ios' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                                <div
                                    onClick={() => setExpandedInstallOption(expandedInstallOption === 'ios' ? null : 'ios')}
                                    className="p-4 flex items-center gap-3 cursor-pointer"
                                >
                                    <i className="fab fa-apple text-2xl text-gray-800"></i>
                                    <div className="flex-1">
                                        <p className={`font-bold text-gray-800 ${settings.language === 'ur' ? 'font-urdu' : ''}`}>{t.installIos}</p>
                                        <p className="text-xs text-gray-500">{t.installIosDesc}</p>
                                    </div>
                                    <i className={`fas fa-chevron-down text-gray-400 transition-transform ${expandedInstallOption === 'ios' ? 'rotate-180' : ''}`}></i>
                                </div>
                                {expandedInstallOption === 'ios' && (
                                    <div className="px-4 pb-4 animate-slide-up">
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-blue-100">
                                                <i className="fas fa-share-square text-blue-500 w-6 text-center"></i>
                                                <p className="text-xs font-medium text-gray-700">{t.installIosStep1}</p>
                                            </div>
                                            <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-blue-100">
                                                <i className="fas fa-arrow-down text-gray-500 w-6 text-center"></i>
                                                <p className="text-xs font-medium text-gray-700">{t.installIosStep2}</p>
                                            </div>
                                            <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-blue-100">
                                                <i className="fas fa-plus-square text-gray-700 w-6 text-center"></i>
                                                <p className="text-xs font-medium text-gray-700">{t.installIosStep3}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Option 3: Windows */}
                            <div className={`border rounded-xl transition-all ${expandedInstallOption === 'windows' ? 'border-cyan-500 bg-cyan-50' : 'border-gray-200 bg-white'}`}>
                                <div
                                    onClick={() => handlePlatformInstall('windows')}
                                    className="p-4 flex items-center gap-3 cursor-pointer"
                                >
                                    <i className="fab fa-windows text-2xl text-cyan-600"></i>
                                    <div className="flex-1">
                                        <p className={`font-bold text-gray-800 ${settings.language === 'ur' ? 'font-urdu' : ''}`}>{t.installWindows}</p>
                                        <p className="text-xs text-gray-500">{t.installWindowsDesc}</p>
                                    </div>
                                    <i className={`fas fa-chevron-down text-gray-400 transition-transform ${expandedInstallOption === 'windows' ? 'rotate-180' : ''}`}></i>
                                </div>
                                {expandedInstallOption === 'windows' && (
                                    <div className="px-4 pb-4 animate-slide-up">
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-cyan-100">
                                                <i className="fas fa-ellipsis-v text-gray-500 w-6 text-center"></i>
                                                <p className="text-xs font-medium text-gray-700">{t.installWindowsStep1}</p>
                                            </div>
                                            <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-cyan-100">
                                                <i className="fas fa-download text-cyan-600 w-6 text-center"></i>
                                                <p className="text-xs font-medium text-gray-700">{t.installWindowsStep2}</p>
                                            </div>
                                            <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-cyan-100">
                                                <i className="fas fa-check-circle text-cyan-600 w-6 text-center"></i>
                                                <p className="text-xs font-medium text-gray-700">{t.installWindowsStep3}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

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

            {/* User Guide Modal */}
            {isUserGuideOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsUserGuideOpen(false)}></div>
                    <div className="relative bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-slide-up max-h-[85vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-lg">
                                    <i className="fas fa-book-open"></i>
                                </div>
                                <h3 className={`text-xl font-bold text-gray-800 ${settings.language === 'ur' ? 'font-urdu-heading' : ''}`}>
                                    {t.userGuideTitle}
                                </h3>
                            </div>
                            <button onClick={() => setIsUserGuideOpen(false)} className="text-gray-400 hover:text-red-500">
                                <i className="fas fa-times-circle text-2xl"></i>
                            </button>
                        </div>

                        <div className={`prose prose-sm max-w-none text-gray-700 whitespace-pre-line leading-relaxed ${settings.language === 'ur' ? 'font-urdu text-right' : ''}`}>
                            {userGuide}
                        </div>

                        <div className="mt-6 text-center pt-4 border-t border-gray-100">
                            <button
                                onClick={() => setIsUserGuideOpen(false)}
                                className="bg-indigo-50 text-indigo-600 px-6 py-2 rounded-full font-bold text-sm hover:bg-indigo-100 transition-colors"
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