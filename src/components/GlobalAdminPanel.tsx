import React, { useState } from 'react';
import { LocationData, Translation, RamadanTiming, Note } from '../types';
import { REMOTE_DATA_URL, REMOTE_NOTES_URL } from '../constants';
import AnalyticsPanel from './AnalyticsPanel';

interface GlobalAdminPanelProps {
  data: LocationData[];
  onUpdate: (newData: LocationData[]) => void;
  notes: Note[];
  onUpdateNotes: (newNotes: Note[]) => void;
  translation: Translation;
  onClose: () => void;
}

const GlobalAdminPanel: React.FC<GlobalAdminPanelProps> = ({ data, onUpdate, notes, onUpdateNotes, translation, onClose }) => {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [editingLocId, setEditingLocId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'analytics'>('editor'); // New Tab State

  // Location Fields
  const [locNameEn, setLocNameEn] = useState('');
  const [locNameUr, setLocNameUr] = useState('');
  const [locWhatsapp, setLocWhatsapp] = useState('');
  const [locCommunity, setLocCommunity] = useState('');
  const [locNearbyAreas, setLocNearbyAreas] = useState('');
  const [locMessageEn, setLocMessageEn] = useState('');
  const [locMessageUr, setLocMessageUr] = useState('');
  const [timingsJson, setTimingsJson] = useState('');

  // Note Input Fields
  const [newGlobalNoteEn, setNewGlobalNoteEn] = useState('');
  const [newGlobalNoteUr, setNewGlobalNoteUr] = useState('');
  const [newLocationNoteEn, setNewLocationNoteEn] = useState('');
  const [newLocationNoteUr, setNewLocationNoteUr] = useState('');

  // User Guide Fields
  const [guideEn, setGuideEn] = useState('');
  const [guideUr, setGuideUr] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  const handleLogin = () => {
    if (password === 'AhsaanGlobal786') setIsAuthenticated(true);
    else alert(translation.adminErrorAuth);
  };

  // Load User Guide on Init
  React.useEffect(() => {
    const guide = notes.find(n => n.type === 'guide');
    if (guide) {
      setGuideEn(guide.text.en);
      setGuideUr(guide.text.ur);
    }
  }, [notes]);

  // --- LOCATION LOGIC ---

  const startAddLocation = () => {
    setEditingLocId('new');
    setLocNameEn('');
    setLocNameUr('');
    setLocWhatsapp('');
    setLocCommunity('');
    setLocNearbyAreas('');
    setLocMessageEn('');
    setLocMessageUr('');
    setTimingsJson('[]');
  };

  const startEditLocation = (loc: LocationData) => {
    setEditingLocId(loc.id);
    setLocNameEn(loc.name_en);
    setLocNameUr(loc.name_ur);
    setLocWhatsapp(loc.whatsapp_number || '');
    setLocCommunity(loc.whatsapp_community || '');
    setLocNearbyAreas(loc.nearby_areas || '');
    setLocMessageEn(loc.custom_message?.en || '');
    setLocMessageUr(loc.custom_message?.ur || '');
    setTimingsJson(JSON.stringify(loc.timings, null, 2));
  };

  const saveLocation = () => {
    try {
      const parsedTimings: RamadanTiming[] = JSON.parse(timingsJson);
      let newData: LocationData[];
      let locId = editingLocId === 'new' ? locNameEn.toLowerCase().replace(/\s+/g, '-') : editingLocId!;

      const locDataPartial = {
        name_en: locNameEn,
        name_ur: locNameUr,
        timings: parsedTimings,
        whatsapp_number: locWhatsapp,
        whatsapp_community: locCommunity,
        nearby_areas: locNearbyAreas,
        custom_message: { en: locMessageEn, ur: locMessageUr }
      };

      if (editingLocId === 'new') {
        const newLoc: LocationData = {
          id: locId,
          ...locDataPartial
        };
        newData = [...data, newLoc];
      } else {
        newData = data.map(l => l.id === editingLocId ? { ...l, ...locDataPartial } : l);
      }

      onUpdate(newData);
      setEditingLocId(null);
    } catch (e) {
      alert("Invalid Timings JSON");
    }
  };

  const deleteLocation = (id: string) => {
    if (window.confirm("Delete this location?")) {
      onUpdate(data.filter(l => l.id !== id));
      // Also remove associated notes
      onUpdateNotes(notes.filter(n => n.locationId !== id));
    }
  };

  // --- NOTE LOGIC ---

  const addGlobalNote = () => {
    if (!newGlobalNoteEn.trim() && !newGlobalNoteUr.trim()) return;
    const note: Note = {
      id: `note_${Date.now()}`,
      text: { en: newGlobalNoteEn, ur: newGlobalNoteUr },
      isGlobal: true
    };
    onUpdateNotes([...notes, note]);
    setNewGlobalNoteEn('');
    setNewGlobalNoteUr('');
  };

  const addLocationNote = () => {
    if ((!newLocationNoteEn.trim() && !newLocationNoteUr.trim()) || !editingLocId) return;
    const locId = editingLocId === 'new' ? 'temp_id_replace_later' : editingLocId;
    const note: Note = {
      id: `note_${Date.now()}`,
      text: { en: newLocationNoteEn, ur: newLocationNoteUr },
      isGlobal: false,
      locationId: locId
    };
    onUpdateNotes([...notes, note]);
    setNewLocationNoteEn('');
    setNewLocationNoteUr('');
  };

  const deleteNote = (id: string) => {
    if (window.confirm("Delete this note?")) {
      onUpdateNotes(notes.filter(n => n.id !== id));
    }
  };

  const saveUserGuide = () => {
    const existingGuide = notes.find(n => n.type === 'guide');
    const newGuideNote: Note = {
      id: existingGuide ? existingGuide.id : `guide_${Date.now()}`,
      text: { en: guideEn, ur: guideUr },
      isGlobal: true,
      type: 'guide'
    };

    // Remove old guide if exists, add new one
    const otherNotes = notes.filter(n => n.type !== 'guide');
    onUpdateNotes([...otherNotes, newGuideNote]);
    alert("User Guide Updated locally! Click 'Save to Cloud' to push changes.");
  };

  // --- SYNC LOGIC ---

  const downloadMaster = () => {
    const fullExport = {
      locations: data,
      notes: notes
    };
    const blob = new Blob([JSON.stringify(fullExport, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "master_full.json";
    a.click();
  };

  const pushToCloud = async () => {
    if (!window.confirm("This will overwrite the database in MongoDB. Continue?")) return;

    setIsSaving(true);
    try {
      // Sync Locations
      const locResponse = await fetch(REMOTE_DATA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password, data: data })
      });
      const locResult = await locResponse.json();

      // Sync Notes
      const noteResponse = await fetch(REMOTE_NOTES_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password, data: notes })
      });
      const noteResult = await noteResponse.json();

      if (locResponse.ok && noteResponse.ok && locResult.success && noteResult.success) {
        alert("✅ Successfully synced Locations & Notes with MongoDB!");
      } else {
        alert(`❌ Sync Failed. Loc: ${locResult.message || locResult.error}, Note: ${noteResult.message || noteResult.error}`);
      }
    } catch (error) {
      alert("❌ Network Error: Is the server running?");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-[100]">
        <div className="bg-white p-6 rounded-2xl w-80 shadow-2xl">
          <div className="text-center mb-6">
            <i className="fas fa-database text-4xl text-green-600 mb-2"></i>
            <h2 className="text-xl font-bold text-slate-800">{translation.globalAdminTitle}</h2>
            <p className="text-xs text-gray-400">Real Admin Access</p>
          </div>
          <input
            type="password"
            placeholder={translation.password}
            className="w-full border border-gray-300 p-3 rounded-lg mb-4 focus:ring-2 focus:ring-green-500 outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="flex space-x-2">
            <button onClick={onClose} className="flex-1 bg-gray-200 py-2 rounded-lg font-bold">{translation.cancel}</button>
            <button onClick={handleLogin} className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-700">{translation.login}</button>
          </div>
        </div>
      </div>
    );
  }

  // Filter notes
  const currentLocationNotes = notes.filter(n => n.locationId === editingLocId);
  const globalNotes = notes.filter(n => n.isGlobal && n.type !== 'guide'); // Exclude guide from generic notes

  return (
    <div className="fixed inset-0 bg-slate-100 z-[100] overflow-y-auto font-sans p-4">
      <div className="max-w-6xl mx-auto">

        {/* Header with Tabs */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm gap-4">
          <div className="flex flex-col gap-2">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <i className="fas fa-database text-green-600"></i> {translation.globalAdminTitle}
              </h2>
              <p className="text-xs text-gray-400">Connected to: namaz_timing</p>
            </div>
            {/* Tabs */}
            <div className="flex gap-4 mt-1 border-b border-gray-100 pb-1">
              <button
                onClick={() => setActiveTab('editor')}
                className={`text-sm font-bold pb-1 border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'editor' ? 'text-indigo-600 border-indigo-600' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
              >
                <i className="fas fa-edit"></i> Editor
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`text-sm font-bold pb-1 border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'analytics' ? 'text-indigo-600 border-indigo-600' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
              >
                <i className="fas fa-chart-pie"></i> Analytics
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={pushToCloud}
              disabled={isSaving}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 text-white shadow-md transition-all ${isSaving ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-cloud-upload-alt"></i>}
              Save to Cloud
            </button>
            <button onClick={downloadMaster} className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg text-xs font-bold"><i className="fas fa-download mr-1"></i> JSON</button>
            <button onClick={onClose} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold">{translation.close}</button>
          </div>
        </div>

        {/* Content Area */}
        {activeTab === 'analytics' ? (
          <AnalyticsPanel />
        ) : (
          <>
            {editingLocId ? (
              <div className="bg-white p-6 rounded-xl shadow-sm space-y-4">
                <h3 className="font-bold text-lg text-gray-800 border-b pb-2">
                  {editingLocId === 'new' ? 'Create Location' : `Edit: ${locNameEn}`}
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-400 block mb-1">Name (EN)</label>
                    <input value={locNameEn} onChange={e => setLocNameEn(e.target.value)} className="w-full border p-3 rounded-xl focus:ring-2 ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 block mb-1">Name (UR)</label>
                    <input value={locNameUr} onChange={e => setLocNameUr(e.target.value)} className="w-full border p-3 rounded-xl focus:ring-2 ring-blue-500 font-urdu" dir="rtl" />
                  </div>
                </div>


                <div>
                  <label className="text-xs font-bold text-emerald-600 block mb-1">Nearby Areas / Villages (Description)</label>
                  <textarea
                    value={locNearbyAreas}
                    onChange={e => setLocNearbyAreas(e.target.value)}
                    placeholder="e.g. Channat, Ballan, Lakhi Jungle... (These areas follow this calendar)"
                    className="w-full h-16 border p-3 rounded-xl focus:ring-2 ring-emerald-500 text-sm bg-emerald-50/30 border-emerald-100 resize-none"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">This text will be shown to users and is searchable.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-400 block mb-1">WhatsApp Number (Optional)</label>
                    <input
                      value={locWhatsapp}
                      onChange={e => setLocWhatsapp(e.target.value)}
                      placeholder="e.g., 923191490380"
                      className="w-full border p-3 rounded-xl focus:ring-2 ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 block mb-1">WhatsApp Community (Optional)</label>
                    <input
                      value={locCommunity}
                      onChange={e => setLocCommunity(e.target.value)}
                      placeholder="e.g., https://whatsapp.com/channel/..."
                      className="w-full border p-3 rounded-xl focus:ring-2 ring-blue-500 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-bold text-gray-400 block mb-1">Custom Home Screen Announcement</label>
                    <textarea
                      value={locMessageEn}
                      onChange={e => setLocMessageEn(e.target.value)}
                      placeholder="English Announcement..."
                      className="w-full h-16 border p-3 rounded-xl focus:ring-2 ring-blue-500 mb-2"
                    />
                    <textarea
                      value={locMessageUr}
                      onChange={e => setLocMessageUr(e.target.value)}
                      placeholder="Urdu Announcement..."
                      className="w-full h-16 border p-3 rounded-xl focus:ring-2 ring-blue-500 font-urdu" dir="rtl"
                    />
                  </div>

                  {/* Location Specific Notes */}
                  <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                    <label className="text-xs font-bold text-indigo-800 block mb-2">Location Notes (Added to list)</label>
                    <div className="flex flex-col gap-2 mb-2">
                      <input
                        value={newLocationNoteEn}
                        onChange={e => setNewLocationNoteEn(e.target.value)}
                        className="text-xs p-2 rounded-lg border border-indigo-200"
                        placeholder="Note in English..."
                      />
                      <div className="flex gap-2">
                        <input
                          value={newLocationNoteUr}
                          onChange={e => setNewLocationNoteUr(e.target.value)}
                          className="flex-1 text-xs p-2 rounded-lg border border-indigo-200 font-urdu"
                          placeholder="Note in Urdu..."
                          dir="rtl"
                        />
                        <button onClick={addLocationNote} className="bg-indigo-600 text-white px-3 rounded-lg text-xs"><i className="fas fa-plus"></i></button>
                      </div>
                    </div>
                    <div className="space-y-2 max-h-24 overflow-y-auto">
                      {currentLocationNotes.map(note => (
                        <div key={note.id} className="bg-white p-2 rounded-lg text-xs flex justify-between items-center shadow-sm">
                          <div className="flex flex-col">
                            <span>{note.text.en}</span>
                            <span className="font-urdu text-right text-gray-500">{note.text.ur}</span>
                          </div>
                          <button onClick={() => deleteNote(note.id)} className="text-red-400 hover:text-red-600"><i className="fas fa-times"></i></button>
                        </div>
                      ))}
                      {currentLocationNotes.length === 0 && <p className="text-xs text-indigo-300 italic">No notes yet.</p>}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1">Timings JSON</label>
                  <textarea value={timingsJson} onChange={e => setTimingsJson(e.target.value)} className="w-full h-64 font-mono text-[10px] p-4 bg-slate-50 border rounded-xl" />
                </div>

                <div className="flex gap-2 mt-4">
                  <button onClick={() => setEditingLocId(null)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold">{translation.cancel}</button>
                  <button onClick={saveLocation} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold">{translation.save}</button>
                </div>
              </div>
            ) : (
              <>
                {/* User Guide Editor Section */}
                <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-amber-500 mb-6">
                  <h3 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
                    <i className="fas fa-book-open"></i> App User Guide (Settings Menu)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <textarea
                      value={guideEn}
                      onChange={e => setGuideEn(e.target.value)}
                      placeholder="User Guide (English)..."
                      className="w-full h-24 border p-3 rounded-lg text-sm focus:ring-2 ring-amber-500"
                    />
                    <textarea
                      value={guideUr}
                      onChange={e => setGuideUr(e.target.value)}
                      placeholder="User Guide (Urdu)..."
                      className="w-full h-24 border p-3 rounded-lg text-sm focus:ring-2 ring-amber-500 font-urdu" dir="rtl"
                    />
                  </div>
                  <button onClick={saveUserGuide} className="bg-amber-100 text-amber-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-amber-200 w-full md:w-auto">
                    Update User Guide Text
                  </button>
                </div>

                {/* Global Notes Section */}
                <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-indigo-500 mb-6">
                  <h3 className="font-bold text-indigo-800 mb-2">Global Notes (Visible to All)</h3>
                  <div className="flex flex-col gap-2 mb-4">
                    <input
                      value={newGlobalNoteEn}
                      onChange={e => setNewGlobalNoteEn(e.target.value)}
                      className="border p-2 rounded-lg text-sm"
                      placeholder="Note in English..."
                    />
                    <div className="flex gap-2">
                      <input
                        value={newGlobalNoteUr}
                        onChange={e => setNewGlobalNoteUr(e.target.value)}
                        className="flex-1 border p-2 rounded-lg text-sm font-urdu"
                        placeholder="Note in Urdu..."
                        dir="rtl"
                      />
                      <button onClick={addGlobalNote} className="bg-indigo-600 text-white px-4 rounded-lg font-bold"><i className="fas fa-plus"></i> Add</button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {globalNotes.map(note => (
                      <div key={note.id} className="flex justify-between items-center bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                        <div className="flex flex-col">
                          <span className="text-sm text-indigo-900">{note.text.en}</span>
                          <span className="text-sm text-indigo-700 font-urdu text-right">{note.text.ur}</span>
                        </div>
                        <button onClick={() => deleteNote(note.id)} className="text-red-500 bg-white w-6 h-6 rounded-full shadow-sm hover:bg-red-50"><i className="fas fa-times"></i></button>
                      </div>
                    ))}
                    {globalNotes.length === 0 && <p className="text-sm text-gray-400 italic">No global notes added.</p>}
                  </div>
                </div>

                {/* Locations Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.map(loc => (
                    <div key={loc.id} className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center border border-gray-100">
                      <div>
                        <h3 className="font-bold text-gray-800">{loc.name_en}</h3>
                        <p className="text-xs text-gray-400">{loc.timings.length} Days</p>
                        {loc.custom_message && <span className="inline-block mt-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[9px] rounded-md mr-1">Announcement</span>}
                        {notes.some(n => n.locationId === loc.id) && <span className="inline-block mt-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] rounded-md">Notes</span>}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => startEditLocation(loc)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><i className="fas fa-edit"></i></button>
                        <button onClick={() => deleteLocation(loc.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><i className="fas fa-trash"></i></button>
                      </div>
                    </div>
                  ))}
                  <button onClick={startAddLocation} className="border-2 border-dashed border-gray-300 p-6 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-all bg-white/50">
                    <i className="fas fa-plus text-2xl mb-2"></i>
                    <span className="font-bold">{translation.addLocation}</span>
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div >
  );
};

export default GlobalAdminPanel;