import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Translation } from '../types';

interface BottomNavProps {
    translation: Translation;
}

const BottomNav: React.FC<BottomNavProps> = ({ translation: t }) => {
    const location = useLocation();

    return (
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
    );
};

export default BottomNav;
