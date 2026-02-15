import React from 'react';
import { useLocation } from 'react-router-dom';
import { AppSettings, LocationData, Translation } from '../types';

interface HeaderProps {
    settings: AppSettings;
    activeLocation: LocationData;
    currentTime: Date;
    timeIsVerified: boolean;
    onToggleLanguage: () => void;
    translation: Translation;
}

const MoonIcon = () => <i className="fas fa-moon"></i>;

const Header: React.FC<HeaderProps> = ({
    settings,
    activeLocation,
    currentTime,
    timeIsVerified,
    onToggleLanguage,
    translation: t
}) => {
    const location = useLocation();
    const isSettingsPage = location.pathname === '/settings';

    return (
        <div className="bg-emerald-700 pb-20 pt-8 px-6 rounded-b-[2.5rem] shadow-lg text-white relative z-10">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2 text-emerald-50">
                        <MoonIcon />
                        <span className={settings.language === 'ur' ? 'font-urdu-heading pt-1' : ''}>{t.title}</span>
                    </h1>
                    <div className="flex flex-col mt-2 opacity-90">
                        {/* Location Name - Highlighting & Increased Size */}
                        <p className={`text-sm font-semibold text-emerald-100 flex items-center gap-1.5 mb-1 ${settings.language === 'ur' ? 'font-urdu-heading' : ''}`}>
                            <i className="fas fa-map-marker-alt text-xs"></i>
                            {settings.language === 'ur' ? activeLocation.name_ur : activeLocation.name_en}
                        </p>

                        {/* Date Display */}
                        <p className="text-[10px] text-emerald-50 font-mono flex items-center gap-1 mt-0.5">
                            <i className="fas fa-calendar-day"></i>
                            {currentTime.toLocaleDateString('en-GB', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                            })}
                        </p>

                        {/* Clock with Sync Status Badge */}
                        <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[10px] text-emerald-50 font-mono flex items-center gap-1">
                                <i className={`fas fa-clock ${timeIsVerified ? 'text-emerald-300' : 'text-yellow-400'}`}></i>
                                {currentTime.toLocaleTimeString('en-US', {
                                    timeZone: 'Asia/Karachi',
                                    hour12: true,
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit'
                                })}
                            </p>
                            <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase ${timeIsVerified ? 'bg-emerald-500/30 text-emerald-100' : 'bg-yellow-500/30 text-yellow-100'}`}>
                                {timeIsVerified
                                    ? (settings.language === 'ur' ? 'درست' : 'Accurate')
                                    : (settings.language === 'ur' ? 'ناقص' : 'Device')
                                }
                            </span>
                        </div>

                        {/* Ref Time - ONLY on Settings Page */}
                        {isSettingsPage && settings.lastSyncTime && (
                            <p className="text-[9px] text-emerald-300 font-mono mt-1 pt-1 border-t border-emerald-600/30 inline-block">
                                {t.refLabel} {settings.lastSyncTime}
                            </p>
                        )}
                    </div>
                </div>
                <button onClick={onToggleLanguage} className="bg-emerald-600/50 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold border border-emerald-400/30">
                    {settings.language === 'en' ? 'اردو' : 'English'}
                </button>
            </div>
        </div>
    );
};

export default Header;
