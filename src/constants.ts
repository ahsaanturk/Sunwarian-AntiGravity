

import { RamadanTiming, Translation, Language, LocationData } from './types';

export const ADMIN_ROUTE = "/local-admin";
export const GLOBAL_ADMIN_ROUTE = "/admin/ahsaan";

// Pointing to the Vercel API Route
export const REMOTE_DATA_URL = "/api/locations";
export const REMOTE_NOTES_URL = "/api/notes";

export const WHATSAPP_NUMBER = "923191490380";
export const DEFAULT_WHATSAPP_COMMUNITY = "https://whatsapp.com/channel/0029VbBlHMN5Ejy4nOt2gZ1P";

export const STORAGE_KEY_DATA = "sunwarian_ramadan_master_v1";
export const STORAGE_KEY_NOTES = "sunwarian_notes_v1";
export const STORAGE_KEY_SETTINGS = "sunwarian_settings_v5";

export const DEFAULT_SETTINGS = {
  notificationsEnabled: true,
  language: 'ur' as Language,
  selectedLocationId: 'sunwarian',
  autoSync: true,
  sehriAlertOffset: 60, // 1 hour default
  iftarAlertOffset: 20, // 20 min default
  wakeLockEnabled: false
};

export const INITIAL_RAMADAN_DATA: RamadanTiming[] = [
  { id: 1, date: "2026-02-17", day_en: "Tuesday", day_ur: "منگل", sehri: "05:25", iftar: "17:50", hijri_date: 1 },
  { id: 2, date: "2026-02-18", day_en: "Wednesday", day_ur: "بدھ", sehri: "05:24", iftar: "17:51", hijri_date: 2 },
  { id: 3, date: "2026-02-19", day_en: "Thursday", day_ur: "جمعرات", sehri: "05:23", iftar: "17:52", hijri_date: 3 },
  { id: 4, date: "2026-02-20", day_en: "Friday", day_ur: "جمعہ", sehri: "05:22", iftar: "17:53", hijri_date: 4 },
  { id: 5, date: "2026-02-21", day_en: "Saturday", day_ur: "ہفتہ", sehri: "05:21", iftar: "17:54", hijri_date: 5 },
  { id: 6, date: "2026-02-22", day_en: "Sunday", day_ur: "اتوار", sehri: "05:20", iftar: "17:55", hijri_date: 6 },
  { id: 7, date: "2026-02-23", day_en: "Monday", day_ur: "پیر", sehri: "05:19", iftar: "17:56", hijri_date: 7 },
  { id: 8, date: "2026-02-24", day_en: "Tuesday", day_ur: "منگل", sehri: "05:17", iftar: "17:57", hijri_date: 8 },
  { id: 9, date: "2026-02-25", day_en: "Wednesday", day_ur: "بدھ", sehri: "05:16", iftar: "17:58", hijri_date: 9 },
  { id: 10, date: "2026-02-26", day_en: "Thursday", day_ur: "جمعرات", sehri: "05:15", iftar: "17:59", hijri_date: 10 },
  { id: 11, date: "2026-02-27", day_en: "Friday", day_ur: "جمعہ", sehri: "05:14", iftar: "18:00", hijri_date: 11 },
  { id: 12, date: "2026-02-28", day_en: "Saturday", day_ur: "ہفتہ", sehri: "05:13", iftar: "18:01", hijri_date: 12 },
  { id: 13, date: "2026-03-01", day_en: "Sunday", day_ur: "اتوار", sehri: "05:11", iftar: "18:02", hijri_date: 13 },
  { id: 14, date: "2026-03-02", day_en: "Monday", day_ur: "پیر", sehri: "05:10", iftar: "18:03", hijri_date: 14 },
  { id: 15, date: "2026-03-03", day_en: "Tuesday", day_ur: "منگل", sehri: "05:09", iftar: "18:04", hijri_date: 15 },
  { id: 16, date: "2026-03-04", day_en: "Wednesday", day_ur: "بدھ", sehri: "05:08", iftar: "18:04", hijri_date: 16 },
  { id: 17, date: "2026-03-05", day_en: "Thursday", day_ur: "جمعرات", sehri: "05:06", iftar: "18:05", hijri_date: 17 },
  { id: 18, date: "2026-03-06", day_en: "Friday", day_ur: "جمعہ", sehri: "05:05", iftar: "18:06", hijri_date: 18 },
  { id: 19, date: "2026-03-07", day_en: "Saturday", day_ur: "ہفتہ", sehri: "05:04", iftar: "18:07", hijri_date: 19 },
  { id: 20, date: "2026-03-08", day_en: "Sunday", day_ur: "اتوار", sehri: "05:03", iftar: "18:08", hijri_date: 20 },
  { id: 21, date: "2026-03-09", day_en: "Monday", day_ur: "پیر", sehri: "05:01", iftar: "18:09", hijri_date: 21 },
  { id: 22, date: "2026-03-10", day_en: "Tuesday", day_ur: "منگل", sehri: "05:00", iftar: "18:09", hijri_date: 22 },
  { id: 23, date: "2026-03-11", day_en: "Wednesday", day_ur: "بدھ", sehri: "04:59", iftar: "18:10", hijri_date: 23 },
  { id: 24, date: "2026-03-12", day_en: "Thursday", day_ur: "جمعرات", sehri: "04:58", iftar: "18:11", hijri_date: 24 },
  { id: 25, date: "2026-03-13", day_en: "Friday", day_ur: "جمعہ", sehri: "04:56", iftar: "18:12", hijri_date: 25 },
  { id: 26, date: "2026-03-14", day_en: "Saturday", day_ur: "ہفتہ", sehri: "04:55", iftar: "18:12", hijri_date: 26 },
  { id: 27, date: "2026-03-15", day_en: "Sunday", day_ur: "اتوار", sehri: "04:54", iftar: "18:13", hijri_date: 27 },
  { id: 28, date: "2026-03-16", day_en: "Monday", day_ur: "پیر", sehri: "04:53", iftar: "18:14", hijri_date: 28 },
  { id: 29, date: "2026-03-17", day_en: "Tuesday", day_ur: "منگل", sehri: "04:51", iftar: "18:15", hijri_date: 29 },
  { id: 30, date: "2026-03-18", day_en: "Wednesday", day_ur: "بدھ", sehri: "04:50", iftar: "18:16", hijri_date: 30 },
];

export const INITIAL_MASTER_DATA: LocationData[] = [
  {
    id: "sunwarian",
    name_en: "Sunwarian, AJK",
    name_ur: "سنواریاں، آزاد کشمیر",
    timings: INITIAL_RAMADAN_DATA
  }
];

export const DUAS = {
  sehri: {
    title: { en: "Sehri Dua", ur: "دعا برائے سحری" },
    arabic: "وَبِصَوْمِ غَدٍ نَّوَيْتُ مِنْ شَهْرِ رَمَضَانَ",
    urdu: "اور میں نے ماہ رمضان کے کل کے روزے کی نیت کی",
    english: "I intend to keep the fast for tomorrow in the month of Ramadan"
  },
  iftar: {
    title: { en: "Iftar Dua", ur: "دعا برائے افطار" },
    arabic: "اللَّهُمَّ اِنِّى لَكَ صُمْتُ وَبِكَ امَنْتُ وَعَلَيْكَ تَوَكَّلْتُ وَعَلَى رِزْقِكَ اَفْطَرْتُ",
    urdu: "اے اللہ! میں نے تیرے لیے روزہ رکھا اور تجھ پر ایمان لایا اور تیرے ہی دیے ہوئے رزق سے افطار کیا",
    english: "O Allah! I fasted for You and I believe in You and I put my trust in You and I break my fast with Your sustenance"
  }
};

export const ASHRA_DUAS = {
  first: {
    arabic: "رَبِّ اغْفِرْ وَارْحَمْ وَأَنْتَ خَيْرُ الرَّاحِمِينَ",
    urdu: "اے میرے رب! مجھے بخش دے اور مجھ پر رحم فرما، تو سب سے بہتر رحم کرنے والا ہے۔",
    english: "O My Lord! Forgive and have mercy, for You are the Best of those who show mercy."
  },
  second: {
    arabic: "أَسْتَغْفِرُ اللَّهَ رَبِّي مِنْ كُلِّ ذَنْبٍ وَأَتُوبُ إِلَيْهِ",
    urdu: "میں اللہ سے اپنے تمام گناہوں کی بخشش مانگتا ہوں جو میرا رب ہے اور اسی کی طرف رجوع کرتا ہوں",
    english: "I seek forgiveness from Allah, my Lord, from every sin, and I turn to Him in repentance."
  },
  third: {
    arabic: "اللَّهُمَّ أَجِرْنِي مِنَ النَّارِ",
    urdu: "اے اللہ! مجھے آگ کے عذاب سے بچا",
    english: "O Allah! Save me from the fire of Hell."
  }
};

export const TRANSLATIONS: Record<Language, Translation> = {
  en: {
    title: "Rozadaar App",
    sehri: "Sehri Ends",
    iftar: "Iftar Time",
    next: "Next Event",
    timeLeft: "Time Remaining",
    settings: "Settings",
    notifications: "Notifications",
    enableNotifications: "Enable Alerts",
    testAlarm: "Test Alarm",
    language: "Language",
    installGuide: "Install App",
    adminLogin: "Local Admin",
    password: "Password",
    login: "Enter",
    updateTimings: "Update Local Timings",
    save: "Save Changes",
    dashboard: "Home",
    calendar: "Calendar",
    today: "Today",
    fasting: "Fasting...",
    completed: "Ramadan Completed",
    sehriInfo: "Sehri ends 10 mins before Fajr.",
    iftarInfo: "Iftar is at Sunset.",
    date: "Date",
    day: "Day",
    ashra1: "1st Ashra - Mercy",
    ashra2: "2nd Ashra - Forgiveness",
    ashra3: "3rd Ashra - Salvation",
    playAudio: "Play Audio",
    ramadanAlert: "Ramadan Alert",
    sehriAlert1Hour: "1 Hour remaining for Sehri!",
    iftarAlert20Min: "20 Minutes to Iftar.",
    sehriEnded: "Sehri Time Ended!",
    iftarTime: "Iftar Time!",

    // Notification Settings
    notificationsSetting: "Notifications & Alerts",
    configureAlerts: "Configure Alerts",
    sehriAlertTime: "Sehri Alert",
    iftarAlertTime: "Iftar Alert",
    timeOptionOff: "Off",
    timeOption10Min: "10 Minutes Before",
    timeOption20Min: "20 Minutes Before",
    timeOption30Min: "30 Minutes Before",
    timeOption1Hour: "1 Hour Before",
    timeOption2Hours: "2 Hours Before",
    preAlertLabel: "Pre-Alarm",
    minutes: "Minutes",

    adminPanelTitle: "Local Data Panel",
    close: "Close",
    cancel: "Cancel",
    adminInstr: "Format must be strict JSON. Use 24h format.",
    adminSuccess: "Data Updated Successfully!",
    adminErrorJson: "Invalid JSON Format",
    adminErrorAuth: "Wrong Password",
    pasteJson: "Paste JSON to update your LOCAL calendar.",
    autoSync: "Auto Sync Data",
    autoSyncDesc: "Automatically update timings from the global server when online.",
    globalAdminTitle: "Global Admin (MongoDB)",
    downloadJson: "Download JSON",
    refLabel: "Ref:",
    eventTimeLabel: "Event Time",
    selectLocation: "Change Location",
    whatsappSupport: "WhatsApp Support",
    whatsappCommunity: "WhatsApp Community",
    online: "Online",
    offline: "Offline",
    addLocation: "Add New Location",
    locationName: "Location Name",
    deleteLocation: "Delete",
    searchPlaceholder: "Search Location...",
    noResults: "No locations found.",

    // Location Request
    requestLocationBtn: "Request New Location",
    requestLocationTitle: "Request Location",
    requestLocationDesc: "Ask App Team to add your location.",
    sayOnWhatsapp: "Say on WhatsApp",

    // PWA Features
    installAppBtn: "Install App",
    keepScreenOn: "Keep Screen Awake",
    installModalTitle: "Install App",
    installModalDesc: "To install this app on your iPhone/iPad:",
    installModalStep1: "Tap the Share button",
    installModalStep2: "Scroll down and tap 'Add to Home Screen'",
    iosShareIcon: "Share",
    iosAddIcon: "Add to Home Screen"
  },
  ur: {
    title: "روزہ دار ایپ",
    sehri: "ختم سحری",
    iftar: "وقت افطار",
    next: "اگلا وقت",
    timeLeft: "باقی وقت",
    settings: "ترتیبات",
    notifications: "نوٹیفکیشن",
    enableNotifications: "الرٹ آن کریں",
    testAlarm: "الارم چیک کریں",
    language: "زبان",
    installGuide: "ایپ انسٹال کریں",
    adminLogin: "لوکل ایڈمن",
    password: "پاس ورڈ",
    login: "داخل ہوں",
    updateTimings: "اوقات اپڈیٹ کریں",
    save: "محفوظ کریں",
    dashboard: "ہوم",
    calendar: "کلینڈر",
    today: "آج",
    fasting: "روزہ جاری ہے...",
    completed: "رمضان مکمل ہو گیا",
    sehriInfo: "سحری کا وقت اذان سے 10 منٹ پہلے ختم ہوتا ہے۔",
    iftarInfo: "افطار کا وقت غروب آفتاب پر ہے۔",
    date: "تاریخ",
    day: "دن",
    ashra1: "پہلا عشرہ - رحمت",
    ashra2: "دوسرا عشرہ - مغفرت",
    ashra3: "تیسرا عشرہ - نجات",
    playAudio: "تلاوت سنیں",
    ramadanAlert: "رمضان الرٹ",
    sehriAlert1Hour: "سحری میں 1 گھنٹہ باقی ہے!",
    iftarAlert20Min: "افطار میں 20 منٹ باقی ہیں۔",
    sehriEnded: "سحری کا وقت ختم ہو گیا!",
    iftarTime: "افطار کا وقت ہو گیا!",

    // Notification Settings
    notificationsSetting: "نوٹیفکیشن اور الرٹ",
    configureAlerts: "ترتیبات",
    sehriAlertTime: "سحری کا الرٹ",
    iftarAlertTime: "افطار کا الرٹ",
    timeOptionOff: "بند",
    timeOption10Min: "10 منٹ پہلے",
    timeOption20Min: "20 منٹ پہلے",
    timeOption30Min: "30 منٹ پہلے",
    timeOption1Hour: "1 گھنٹہ پہلے",
    timeOption2Hours: "2 گھنٹے پہلے",
    preAlertLabel: "پری الارم",
    minutes: "منٹ",

    adminPanelTitle: "لوکل ڈیٹا پینل",
    close: "بند کریں",
    cancel: "منسوخ کریں",
    adminInstr: "JSON فارمیٹ درست ہونا چاہیے۔ 24 گھنٹے کا وقت استعمال کریں۔",
    adminSuccess: "ڈیٹا کامیابی سے اپ ڈیٹ ہو گیا!",
    adminErrorJson: "غلط JSON فارمیٹ",
    adminErrorAuth: "غلط پاس ورڈ",
    pasteJson: "اپنے لوکل کلینڈر کو اپ ڈیٹ کرنے کے لیے JSON پیسٹ کریں۔",
    autoSync: "آٹو سنک (Auto Sync)",
    autoSyncDesc: "انٹرنیٹ ہونے پر عالمی سرور سے اوقات خود بخود اپ ڈیٹ کریں۔",
    globalAdminTitle: "گلوبل ایڈمن (MongoDB)",
    downloadJson: "JSON ڈاؤن لوڈ کریں",
    refLabel: "حوالہ:",
    eventTimeLabel: "وقت",
    selectLocation: "علاقہ تبدیل کریں",
    whatsappSupport: "واٹس ایپ سپورٹ",
    whatsappCommunity: "واٹس ایپ کمیونٹی",
    online: "آن لائن",
    offline: "آف لائن",
    addLocation: "نیا علاقہ شامل کریں",
    locationName: "علاقے کا نام",
    deleteLocation: "حذف کریں",
    searchPlaceholder: "علاقہ تلاش کریں...",
    noResults: "کوئی علاقہ نہیں ملا۔",

    // Location Request
    requestLocationBtn: "نیا علاقہ شامل کروائیں",
    requestLocationTitle: "علاقہ شامل کرنے کی درخواست",
    requestLocationDesc: "ایپ ٹیم سے اپنا علاقہ شامل کرنے کی درخواست کریں۔",
    sayOnWhatsapp: "واٹس ایپ پر کہیں",

    // PWA Features
    installAppBtn: "ایپ انسٹال کریں",
    keepScreenOn: "اسکرین آن رکھیں",
    installModalTitle: "ایپ انسٹال کریں",
    installModalDesc: "آئی فون پر انسٹال کرنے کا طریقہ:",
    installModalStep1: "شیئر بٹن دبائیں",
    installModalStep2: "'Add to Home Screen' منتخب کریں",
    iosShareIcon: "شیئر",
    iosAddIcon: "Add to Home Screen"
  }
};