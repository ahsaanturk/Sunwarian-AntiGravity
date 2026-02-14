import { STORAGE_KEY_DATA, STORAGE_KEY_SETTINGS, STORAGE_KEY_NOTES, INITIAL_MASTER_DATA, DEFAULT_SETTINGS } from '../constants';
import { LocationData, AppSettings, Note } from '../types';

export const getStoredData = (): LocationData[] => {
  const stored = localStorage.getItem(STORAGE_KEY_DATA);
  if (stored) {
    try {
        return JSON.parse(stored);
    } catch (e) {
        return INITIAL_MASTER_DATA;
    }
  }
  return INITIAL_MASTER_DATA;
};

export const saveStoredData = (data: LocationData[]) => {
  localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(data));
};

export const getStoredNotes = (): Note[] => {
  const stored = localStorage.getItem(STORAGE_KEY_NOTES);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      return [];
    }
  }
  return [];
};

export const saveStoredNotes = (notes: Note[]) => {
  localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(notes));
};

export const getSettings = (): AppSettings => {
  const stored = localStorage.getItem(STORAGE_KEY_SETTINGS);
  if (stored) {
    const parsed = JSON.parse(stored);
    return { ...DEFAULT_SETTINGS, ...parsed };
  }
  return DEFAULT_SETTINGS;
};

export const saveSettings = (settings: AppSettings) => {
  localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
};