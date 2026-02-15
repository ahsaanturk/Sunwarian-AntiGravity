import React from 'react';
import { LocationData, AppSettings, Translation } from '../types';

interface LocationModalProps {
    isOpen: boolean;
    onClose: () => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    filteredLocations: LocationData[];
    settings: AppSettings;
    onSelectLocation: (id: string) => void;
    translation: Translation;
}

const LocationModal: React.FC<LocationModalProps> = ({
    isOpen,
    onClose,
    searchQuery,
    setSearchQuery,
    filteredLocations,
    settings,
    onSelectLocation,
    translation: t
}) => {
    const [isRequestModalOpen, setIsRequestModalOpen] = React.useState(false);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="relative bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl h-[65vh] flex flex-col overflow-hidden animate-slide-up z-10">
                <div className="w-full flex justify-center pt-3 pb-2 bg-white flex-shrink-0 cursor-pointer" onClick={onClose}>
                    <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
                </div>
                <div className="px-5 pb-3 bg-white flex-shrink-0">
                    <div className="bg-gray-100 rounded-2xl px-4 py-3 flex items-center gap-3 border border-transparent focus-within:border-emerald-100 focus-within:bg-white focus-within:shadow-md transition-all">
                        <i className="fas fa-search text-gray-400"></i>
                        <input autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t.searchPlaceholder} className="bg-transparent border-none outline-none w-full text-base font-bold text-gray-700 placeholder-gray-400" />
                        {searchQuery && <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-red-500"><i className="fas fa-times-circle"></i></button>}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar mb-20">
                    {filteredLocations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center pt-10 pb-4 text-gray-400 opacity-70">
                            <i className="fas fa-map-marker-slash text-4xl mb-3"></i>
                            <p className="font-medium">{t.noResults}</p>
                        </div>
                    ) : (
                        <div className="space-y-2 pb-2">
                            {filteredLocations.map((loc) => (
                                <div key={loc.id} onClick={() => onSelectLocation(loc.id)} className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all active:scale-[0.98] ${loc.id === settings.selectedLocationId ? 'bg-emerald-50/50 border-emerald-500 shadow-sm ring-1 ring-emerald-500' : 'bg-white border-gray-100 hover:border-emerald-200 hover:bg-gray-50'}`}>
                                    <div>
                                        <h3 className={`font-bold text-lg ${loc.id === settings.selectedLocationId ? 'text-emerald-800' : 'text-gray-800'}`}>{settings.language === 'ur' ? loc.name_ur : loc.name_en}</h3>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{loc.timings.length} Days</p>
                                    </div>
                                    {loc.id === settings.selectedLocationId ? <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-emerald-200 shadow-lg"><i className="fas fa-check"></i></div> : <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-300"><i className="fas fa-chevron-right text-xs"></i></div>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Fixed Request Location Button Footer */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 flex justify-center z-20">
                    <button
                        onClick={() => setIsRequestModalOpen(true)}
                        className="bg-gray-50 hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 font-bold py-3 px-6 rounded-full border border-gray-200 hover:border-emerald-200 transition-all text-xs flex items-center gap-2 shadow-sm w-full justify-center sm:w-auto"
                    >
                        <i className="fas fa-plus-circle"></i>
                        {t.requestLocationBtn}
                    </button>
                </div>
            </div>

            {/* Request Location Modal Step 2 */}
            {isRequestModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsRequestModalOpen(false)}></div>
                    <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 relative z-20 animate-slide-up shadow-2xl">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                                <i className="fas fa-map-marked-alt"></i>
                            </div>
                            <h3 className={`text-xl font-bold text-gray-800 mb-2 ${settings.language === 'ur' ? 'font-urdu-heading' : ''}`}>{t.requestLocationTitle}</h3>
                            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                                {t.requestLocationDesc}
                            </p>

                            <a
                                href={`https://wa.me/923191490380?text=${encodeURIComponent(t.requestLocationMsg)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-[#25D366] text-white font-bold py-3.5 px-6 rounded-xl w-full flex items-center justify-center gap-3 hover:bg-[#20bd5a] transition-colors shadow-lg shadow-green-200"
                            >
                                <i className="fab fa-whatsapp text-xl"></i>
                                {t.sayOnWhatsapp}
                            </a>

                            <button
                                onClick={() => setIsRequestModalOpen(false)}
                                className="mt-4 text-gray-400 text-xs font-bold py-2 hover:text-gray-600"
                            >
                                {t.cancel}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LocationModal;
