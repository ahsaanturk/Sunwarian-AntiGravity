import React, { useState, useEffect } from 'react';
import { RamadanTiming, Translation, AppSettings } from '../types';

interface AdminPanelProps {
  data: RamadanTiming[];
  onUpdate: (newData: RamadanTiming[]) => void;
  translation: Translation;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
}

const DAYS_UR = ['اتوار', 'پیر', 'منگل', 'بدھ', 'جمعرات', 'جمعہ', 'ہفتہ'];
const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const AdminPanel: React.FC<AdminPanelProps> = ({ data, onUpdate, translation, onClose, settings, onUpdateSettings }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [localData, setLocalData] = useState<RamadanTiming[]>(data);
  const [startDate, setStartDate] = useState<string>('2026-02-18'); // Default guess

  // Analyze current data to set initial start date state
  useEffect(() => {
    if (data.length > 0) {
      setStartDate(data[0].date);
      setLocalData(data);
    }
  }, [data]);

  const handleLogin = () => {
    if (password === 'Rozadaar') {
      setIsAuthenticated(true);
    } else {
      alert(translation.adminErrorAuth);
    }
  };

  const generateDataFromStart = (start: string) => {
    const newStartDate = new Date(start);
    const newData = localData.map((item, index) => {
      const currentDate = new Date(newStartDate);
      currentDate.setDate(newStartDate.getDate() + index); // Increment day by index

      const dayIndex = currentDate.getDay();
      const dateStr = currentDate.toISOString().split('T')[0];

      return {
        ...item,
        date: dateStr,
        day_en: DAYS_EN[dayIndex],
        day_ur: DAYS_UR[dayIndex],
      };
    });
    setLocalData(newData);
    setStartDate(start);
  };

  const handleTimeChange = (id: number, field: 'sehri' | 'iftar', value: string) => {
    setLocalData(prev => prev.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleSave = () => {
    onUpdate(localData);
    alert(translation.adminSuccess);
    onClose();
  };

  const toggleAutoSync = () => {
    onUpdateSettings({ ...settings, autoSync: !settings.autoSync });
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
        <div className="bg-white p-6 rounded-2xl w-80 shadow-2xl">
          <h2 className="text-xl font-bold text-emerald-800 mb-4">{translation.adminLogin}</h2>
          <div className="relative mb-4">
            <input
              type={showPassword ? "text" : "password"}
              placeholder={translation.password}
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-600 focus:outline-none"
            >
              <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg font-bold"
            >
              {translation.cancel}
            </button>
            <button
              onClick={handleLogin}
              className="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-700"
            >
              {translation.login}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-emerald-800">{translation.adminPanelTitle}</h2>
          <button onClick={onClose} className="text-red-500 font-bold">{translation.close}</button>
        </div>

        {/* Auto Sync Toggle */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl" onClick={toggleAutoSync}>
          <div className="flex items-center justify-between cursor-pointer">
            <div>
              <h3 className="font-bold text-blue-900">{translation.autoSync}</h3>
              <p className="text-xs text-blue-700 mt-1 pr-2">{translation.autoSyncDesc}</p>
            </div>
            <div className={`w-12 h-7 rounded-full transition-colors relative flex-shrink-0 ${settings.autoSync ? 'bg-blue-600' : 'bg-gray-300'}`}>
              <div className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full transition-transform shadow-sm ${settings.autoSync ? 'translate-x-5' : ''}`}></div>
            </div>
          </div>
        </div>

        {settings.autoSync ? (
          <div className="text-center py-8 text-gray-400">
            <i className="fas fa-lock text-4xl mb-3"></i>
            <p className="text-sm">Editing disabled while Auto Sync is ON.</p>
            <p className="text-xs mt-1">Disable Auto Sync above to make local changes.</p>
          </div>
        ) : (
          <div className="space-y-6">

            {/* Start Date Selector */}
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
              <h3 className="font-bold text-emerald-900 mb-3">Select 1st Ramadan Date:</h3>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 rounded-lg border border-emerald-200 shadow-sm">
                  <input
                    type="radio"
                    name="startDate"
                    value="2026-02-18"
                    checked={startDate === '2026-02-18'}
                    onChange={() => generateDataFromStart('2026-02-18')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-medium text-gray-700">18 Feb 2026</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 rounded-lg border border-emerald-200 shadow-sm">
                  <input
                    type="radio"
                    name="startDate"
                    value="2026-02-19"
                    checked={startDate === '2026-02-19'}
                    onChange={() => generateDataFromStart('2026-02-19')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-medium text-gray-700">19 Feb 2026</span>
                </label>
              </div>
            </div>

            {/* Visual Editor Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
              <table className="w-full text-sm text-left rtl:text-right text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th scope="col" className="px-3 py-3 w-16 text-center">Roza</th>
                    <th scope="col" className="px-3 py-3">Date</th>
                    <th scope="col" className="px-3 py-3 w-32 text-center">Sehri (AM)</th>
                    <th scope="col" className="px-3 py-3 w-32 text-center">Iftar (PM)</th>
                  </tr>
                </thead>
                <tbody>
                  {localData.map((item) => (
                    <tr key={item.id} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-3 py-2 font-bold text-center text-gray-900">
                        {item.id}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900">{item.date}</div>
                        <div className="text-xs text-gray-500">{item.day_en} | {item.day_ur}</div>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="time"
                          value={item.sehri}
                          onChange={(e) => handleTimeChange(item.id, 'sehri', e.target.value)}
                          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2 text-center"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="time"
                          value={item.iftar}
                          onChange={(e) => handleTimeChange(item.id, 'iftar', e.target.value)}
                          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2 text-center"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={handleSave}
              className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-emerald-700 transition-colors sticky bottom-0"
            >
              {translation.save}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;