

export interface RamadanTiming {
  id: number;
  date: string; // YYYY-MM-DD
  day_en: string;
  day_ur: string;
  sehri: string; // HH:MM 24h format
  iftar: string; // HH:MM 24h format
  hijri_date: number;
}

export interface LocationData {
  id: string;
  name_en: string;
  name_ur: string;
  timings: RamadanTiming[];
  whatsapp_number?: string;
  custom_message?: { en: string; ur: string };
  whatsapp_community?: string;
}

export interface Note {
  id: string;
  text: { en: string; ur: string };
  isGlobal: boolean;
  locationId?: string; // Required if isGlobal is false
  type?: 'note' | 'guide';
}

export type Language = 'en' | 'ur';

export interface AppSettings {
  notificationsEnabled: boolean;
  language: Language;
  selectedLocationId: string;
  autoSync: boolean;
  lastSyncTime?: string;
  sehriAlertOffset: number; // minutes, 0 = off
  iftarAlertOffset: number; // minutes, 0 = off
  wakeLockEnabled: boolean;
}

export interface Translation {
  title: string;
  sehri: string;
  iftar: string;
  next: string;
  timeLeft: string;
  settings: string;
  notifications: string;
  enableNotifications: string;
  testAlarm: string;
  language: string;
  userGuideBtn: string;
  userGuideTitle: string;
  installGuide: string;
  adminLogin: string;
  password: string;
  login: string;
  updateTimings: string;
  save: string;
  dashboard: string;
  calendar: string;
  today: string;
  fasting: string;
  completed: string;
  sehriInfo: string;
  iftarInfo: string;
  date: string;
  day: string;
  ashra1: string;
  ashra2: string;
  ashra3: string;

  // Audio
  playAudio: string;

  // Notifications
  ramadanAlert: string;
  sehriAlert1Hour: string;
  iftarAlert20Min: string;
  sehriEnded: string;
  iftarTime: string;

  // Notification Settings
  notificationsSetting: string;
  configureAlerts: string;
  sehriAlertTime: string;
  iftarAlertTime: string;
  timeOptionOff: string;
  timeOption10Min: string;
  timeOption20Min: string;
  timeOption30Min: string;
  timeOption1Hour: string;
  timeOption2Hours: string;
  preAlertLabel: string;
  minutes: string;

  // Admin Panel
  adminPanelTitle: string;
  close: string;
  cancel: string;
  adminInstr: string;
  adminSuccess: string;
  adminErrorJson: string;
  adminErrorAuth: string;
  pasteJson: string;

  // Sync & Locations
  autoSync: string;
  autoSyncDesc: string;
  globalAdminTitle: string;
  downloadJson: string;
  refLabel: string;
  eventTimeLabel: string;
  selectLocation: string;
  whatsappSupport: string;
  whatsappCommunity: string;
  online: string;
  offline: string;
  addLocation: string;
  locationName: string;
  deleteLocation: string;

  // Search
  searchPlaceholder: string;
  noResults: string;

  // Location Request
  requestLocationBtn: string;
  requestLocationTitle: string;
  requestLocationDesc: string;
  sayOnWhatsapp: string;

  // PWA Features
  installAppBtn: string;
  keepScreenOn: string;
  installModalTitle: string;
  installModalDesc: string;
  installModalStep1: string;
  installModalStep2: string;
  iosShareIcon: string;
  iosAddIcon: string;
  genericInstallDesc: string;
  genericInstallStep1: string;
  genericInstallStep2: string;

  // Revamped Install Flow
  installAndroid: string;
  installAndroidDesc: string;
  installAndroidStep1: string;
  installAndroidStep2: string;
  installAndroidStep3: string;
  installWindows: string;
  installWindowsDesc: string;
  installWindowsStep1: string;
  installWindowsStep2: string;
  installWindowsStep3: string;
  installIos: string;
  installIosDesc: string;
  installIosStep1: string;
  installIosStep2: string;
  installIosStep3: string;
}