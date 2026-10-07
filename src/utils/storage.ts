import { Prize, SpinLog, SystemSettings, QuizQuestion, CompetitionEntry } from '../types';
import { GLOBAL_SUPABASE_CONFIG } from '../services/supabase';
import {
  saveEntryToIDB,
  getAllEntriesFromIDB,
  deleteEntryFromIDB,
  clearEntriesFromIDB,
  saveSpinToIDB,
  getAllSpinsFromIDB,
  clearSpinsFromIDB,
} from './offlineDb';

export const INITIAL_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    question: 'Jaká je aktuální verze systému Android?',
    options: [
      { id: 'q1_o1', text: 'Android 15', isCorrect: false },
      { id: 'q1_o2', text: 'Android 16', isCorrect: false },
      { id: 'q1_o3', text: 'Android 17', isCorrect: true },
    ],
    explanation: 'Aktuální verzí systému Android je Android 17.',
  },
  {
    id: 'q2',
    question: 'Co je Gemini Intelligence?',
    options: [
      {
        id: 'q2_o1',
        text: 'Umělá inteligence integrovaná přímo do operačního systému, která propojuje aplikace, automatizuje úkoly a nabízí pokročilé systémové funkce',
        isCorrect: true,
      },
      {
        id: 'q2_o2',
        text: 'Hardwarový AI čip od společnosti Google určený výhradně pro výpočetní servery a cloudová datacentra',
        isCorrect: false,
      },
      {
        id: 'q2_o3',
        text: 'Placený měsíční tarif vyhledávače Google, který odstraňuje reklamy a nabízí neomezené úložiště',
        isCorrect: false,
      },
    ],
    explanation: 'Gemini Intelligence je pokročilá umělá inteligence integrovaná přímo do operačního systému propojující systémové aplikace.',
  },
  {
    id: 'q3',
    question: 'Jak se jmenuje funkce u telefonů Pixel 11 Pro a Pixel 11 Pro XL, která mi umožňuje nastavit barevné světelné oznámení pro oblíbené kontakty?',
    options: [
      { id: 'q3_o1', text: 'HiLight', isCorrect: true },
      { id: 'q3_o2', text: 'Nejlepší kontakt', isCorrect: false },
      { id: 'q3_o3', text: 'Kdo to volá', isCorrect: false },
    ],
    explanation: 'Funkce HiLight nabízí přizpůsobitelná barevná světelná oznámení pro oblíbené kontakty.',
  },
  {
    id: 'q4',
    question: 'Jsou modely Pixel 11 Pro a Pixel 11 Pro XL stejné telefony, které se liší v podstatě jen velikostí? (když nepočítáme velikost displeje, baterie nebo rychlost kabelového nabíjení)',
    options: [
      { id: 'q4_o1', text: 'Ano', isCorrect: true },
      { id: 'q4_o2', text: 'Ne', isCorrect: false },
    ],
    explanation: 'Modely Pixel 11 Pro a Pixel 11 Pro XL sdílejí totožnou špičkovou výbavu a liší se v podstatě jen velikostí displeje, baterie a rychlostí nabíjení.',
  },
  {
    id: 'q5',
    question: 'Jaké modely z řady Google Pixel 11 máte v nabídce?',
    options: [
      { id: 'q5_o1', text: 'Pixel 11, Pixel 11 Pro a Pixel 11 Ultra', isCorrect: false },
      { id: 'q5_o2', text: 'Pixel 11 a Pixel 11 Pro Max', isCorrect: false },
      { id: 'q5_o3', text: 'Pixel 11, Pixel 11 Pro a Pixel 11 Pro XL', isCorrect: true },
    ],
    explanation: 'V nabídce řady Google Pixel 11 jsou modely Pixel 11, Pixel 11 Pro a Pixel 11 Pro XL.',
  },
  {
    id: 'q6',
    question: 'Jaké všechny fotoaparáty mají modely řady Pixel 11?',
    options: [
      { id: 'q6_o1', text: 'Hlavní, teleobjektiv a ultra širokoúhlý', isCorrect: true },
      { id: 'q6_o2', text: 'Hlavní a teleobjektiv', isCorrect: false },
      { id: 'q6_o3', text: 'Hlavní a ultra širokoúhlý', isCorrect: false },
    ],
    explanation: 'Modely řady Pixel 11 mají kompletní trojitou fotosoustavu: hlavní snímač, teleobjektiv i ultra širokoúhlý fotoaparát.',
  },
  {
    id: 'q7',
    question: 'Jaký maximální zoom ve fotoaparátu mohu udělat na telefonech Pixel 11 Pro a Pixel 11 Pro XL?',
    options: [
      { id: 'q7_o1', text: '30x', isCorrect: false },
      { id: 'q7_o2', text: '100x', isCorrect: false },
      { id: 'q7_o3', text: '120x', isCorrect: true },
    ],
    explanation: 'Telefony Pixel 11 Pro a Pixel 11 Pro XL dosahují maximálního přiblížení až 120x.',
  },
  {
    id: 'q8',
    question: 'Jak dlouhou systémovou podporu má aktuální portfolio telefonů Google Pixel?',
    options: [
      { id: 'q8_o1', text: '5 let', isCorrect: false },
      { id: 'q8_o2', text: '7 let', isCorrect: true },
      { id: 'q8_o3', text: '10 let', isCorrect: false },
    ],
    explanation: 'Google poskytuje na své aktuální telefony garantovanou 7letou systémovou i bezpečnostní podporu.',
  },
  {
    id: 'q9',
    question: 'Jaké zadní fotoaparáty má telefon Google Pixel 10a?',
    options: [
      { id: 'q9_o1', text: 'Hlavní 48MP s podporou makro zaostření, ultra širokoúhlý 13MP', isCorrect: true },
      { id: 'q9_o2', text: 'Hlavní 13MP a 2MP teleobjektiv', isCorrect: false },
      { id: 'q9_o3', text: 'Hlavní 48MP, 5MP teleobjektiv a 5MP makro', isCorrect: false },
    ],
    explanation: 'Google Pixel 10a je vybaven hlavním 48MP snímačem s podporou makro zaostření a 13MP ultra širokoúhlým fotoaparátem.',
  },
  {
    id: 'q10',
    question: 'Jaký maximální jas má telefon Google Pixel 10a?',
    options: [
      { id: 'q10_o1', text: '1200 nitů', isCorrect: false },
      { id: 'q10_o2', text: '2700 nitů', isCorrect: false },
      { id: 'q10_o3', text: '3000 nitů', isCorrect: true },
    ],
    explanation: 'Displej telefonu Google Pixel 10a má maximální jas až 3000 nitů.',
  },
];

export const DEFAULT_PRIZE_IMAGE_BY_ID: Record<string, string> = {
  p1: '/charger.png',
  p2: '/chargingstand.png',
  p3: '/kickstand.png',
  p4: '/adapter.png',
  p5: '/pixelbuds.png',
  p6: '/bryle.png',
  p7: '/lanyard.png',
  p8: '/termohrnek.png',
  p9: '/ponozky.png',
  p10: '/batoh.png',
  p11: '/cepice.png',
};

export function resolvePrizeImage(prize: Partial<Prize>): string | undefined {
  if (prize.image) return prize.image;
  if (prize.id && DEFAULT_PRIZE_IMAGE_BY_ID[prize.id]) {
    return DEFAULT_PRIZE_IMAGE_BY_ID[prize.id];
  }
  const lower = (prize.name || '').toLowerCase();
  if (lower.includes('kickstand')) return '/kickstand.png';
  if (lower.includes('stand') || lower.includes('stojánek') || lower.includes('stojan')) {
    if (lower.includes('magnetic') || lower.includes('magnetick')) {
      return '/kickstand.png';
    }
    return '/chargingstand.png';
  }
  if (lower.includes('charger') || lower.includes('nabíječ')) return '/charger.png';
  if (lower.includes('adapt') || lower.includes('67w')) return '/adapter.png';
  if (lower.includes('buds') || lower.includes('sluchátka')) return '/pixelbuds.png';
  if (lower.includes('brýle') || lower.includes('bryle') || lower.includes('sluneč')) return '/bryle.png';
  if (lower.includes('lanyard') || lower.includes('šňůrk') || lower.includes('snurk')) return '/lanyard.png';
  if (lower.includes('termohrnek') || lower.includes('hrnek') || lower.includes('mug')) return '/termohrnek.png';
  if (lower.includes('ponožk') || lower.includes('ponozk') || lower.includes('socks')) return '/ponozky.png';
  if (lower.includes('batoh') || lower.includes('backpack') || lower.includes('bag')) return '/batoh.png';
  if (
    lower.includes('čepice') ||
    lower.includes('cepice') ||
    lower.includes('cap') ||
    lower.includes('kšiltovka') ||
    lower.includes('ksiltovka') ||
    lower.includes('beanie')
  ) {
    return '/cepice.png';
  }
  return undefined;
}

const INITIAL_PRIZES: Prize[] = [
  {
    id: 'p1',
    name: 'Qi2 Nabíječka',
    color: '#fff7f4', // porcelain pearl
    textColor: '#231510',
    weight: 5,
    active: true,
    stock: 10,
    initialStock: 10,
    image: '/charger.png',
  },
  {
    id: 'p2',
    name: 'Qi2 Stojánek',
    color: '#f5ded6', // soft blush porcelain
    textColor: '#231510',
    weight: 4,
    active: true,
    stock: 10,
    initialStock: 10,
    image: '/chargingstand.png',
  },
  {
    id: 'p3',
    name: 'Kickstand',
    color: '#faebe4', // delicate rose cream
    textColor: '#231510',
    weight: 6,
    active: true,
    stock: 15,
    initialStock: 15,
    image: '/kickstand.png',
  },
  {
    id: 'p4',
    name: '67W Adaptér',
    color: '#f1d7cc', // blush apricot
    textColor: '#231510',
    weight: 5,
    active: true,
    stock: 10,
    initialStock: 10,
    image: '/adapter.png',
  },
  {
    id: 'p5',
    name: 'Pixel Buds',
    color: '#f6d2c4', // rose gold champagne accent
    textColor: '#231510',
    weight: 3,
    active: true,
    stock: 5,
    initialStock: 5,
    image: '/pixelbuds.png',
  },
  {
    id: 'p6',
    name: 'Sluneční brýle',
    color: '#fff5f0', // silky porcelain white
    textColor: '#231510',
    weight: 7,
    active: true,
    stock: 20,
    initialStock: 20,
    image: '/bryle.png',
  },
  {
    id: 'p7',
    name: 'Lanyard',
    color: '#f8e2d9', // rose peach
    textColor: '#231510',
    weight: 8,
    active: true,
    stock: 50,
    initialStock: 50,
    image: '/lanyard.png',
  },
  {
    id: 'p8',
    name: 'Termohrnek',
    color: '#faede7', // warm porcelain
    textColor: '#231510',
    weight: 6,
    active: true,
    stock: 15,
    initialStock: 15,
    image: '/termohrnek.png',
  },
  {
    id: 'p9',
    name: 'Ponožky',
    color: '#fdf1ec', // warm delicate ivory
    textColor: '#231510',
    weight: 7,
    active: true,
    stock: 25,
    initialStock: 25,
    image: '/ponozky.png',
  },
  {
    id: 'p10',
    name: 'Batoh',
    color: '#faece5', // soft warm porcelain rose
    textColor: '#231510',
    weight: 4,
    active: true,
    stock: 5,
    initialStock: 5,
    image: '/batoh.png',
  },
  {
    id: 'p11',
    name: 'Čepice',
    color: '#fdf3ef', // delicate silky ivory blush
    textColor: '#231510',
    weight: 6,
    active: true,
    stock: 15,
    initialStock: 15,
    image: '/cepice.png',
  },
];

const DEFAULT_SETTINGS: SystemSettings = {
  pin: '1008',
  eventTitle: 'Pixel 11',
  eventSubTitle: '',
  soundEnabled: true,
  minSpinsDuration: 5,
  minPassingScore: 5, // at least 5 out of 10 to spin wheel
  grandPrizeScore: 10, // exactly 10 out of 10 to enter grand prize draw
  allowedEmailRegex: '^[a-zA-Z0-9._%+-]+@(vodafone\\.cz|vodafone\\.com)$',
  googleSheetWebhookUrl:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_SHEET_WEBHOOK_URL) || '',
  supabaseUrl: GLOBAL_SUPABASE_CONFIG.url,
  supabaseAnonKey: GLOBAL_SUPABASE_CONFIG.anonKey,
};

const STORAGE_KEYS = {
  PRIZES: 'kolo_stesti_prizes_v4',
  SETTINGS: 'kolo_stesti_settings',
  SPINS: 'kolo_stesti_spins',
  QUESTIONS: 'kolo_stesti_questions_v3',
  EMAILS: 'kolo_stesti_emails',
  PARTICIPATED_EMAILS: 'kolo_stesti_participated_emails',
  DEVICE_UNLOCKED: 'kolo_stesti_device_unlocked',
};

// Safe storage wrapper with in-memory fallback for mobile / private browsing
const memoryStore: Record<string, string> = {};

const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch {
      // Ignored - fallback to memory
    }
    return memoryStore[key] ?? null;
  },
  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Ignored - fallback to memory
    }
    memoryStore[key] = value;
  },
  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Ignored - fallback to memory
    }
    delete memoryStore[key];
  },
};

export function getStoredPrizes(): Prize[] {
  try {
    const data = safeStorage.getItem(STORAGE_KEYS.PRIZES);
    if (data) {
      const parsed: Prize[] = JSON.parse(data);
      // Migrate legacy saturated default colors if found
      const legacyColorMap: Record<string, { color: string; textColor: string }> = {
        '#174EA6': { color: '#fff7f4', textColor: '#231510' },
        '#A50E0E': { color: '#f5ded6', textColor: '#231510' },
        '#E37400': { color: '#faebe4', textColor: '#231510' },
        '#4285F4': { color: '#f1d7cc', textColor: '#231510' },
        '#EA4335': { color: '#fff5f0', textColor: '#231510' },
        '#FBBC04': { color: '#f8e2d9', textColor: '#231510' },
        '#34A853': { color: '#faede7', textColor: '#231510' },
        '#eab308': { color: '#f6d2c4', textColor: '#8e3a18' },
        '#3b82f6': { color: '#fff7f4', textColor: '#231510' },
      };

      const legacyNameMap: Record<string, string> = {
        'Qi2 Wireless Charger': 'Qi2 Nabíječka',
        'Qi2 Wireless Charger + Stand': 'Qi2 Stojánek',
        'Magnetic Kickstand': 'Kickstand',
        '67W Dual Port Power Adapter': '67W Adaptér',
        'Buds 2a': 'Pixel Buds',
      };

      const updated: Prize[] = parsed.map((p): Prize => {
        let name = p.name;
        // Migrate legacy long English names to clean balanced names
        if (name && legacyNameMap[name]) {
          name = legacyNameMap[name];
        } else if (name && name.length > 0 && name[0] === name[0].toLowerCase() && name[0] !== name[0].toUpperCase()) {
          name = name.charAt(0).toUpperCase() + name.slice(1);
        }

        const image = p.image || resolvePrizeImage({ ...p, name });

        const defaultStockMap: Record<string, number> = {
          p1: 10,
          p2: 10,
          p3: 15,
          p4: 10,
          p5: 5,
          p6: 20,
          p7: 50,
          p8: 15,
          p9: 25,
          p10: 5,
          p11: 15,
        };
        const stock =
          p.stock !== undefined && p.stock !== null ? p.stock : defaultStockMap[p.id] ?? 10;
        const initialStock =
          p.initialStock !== undefined && p.initialStock !== null
            ? p.initialStock
            : defaultStockMap[p.id] ?? 10;

        const active = stock <= 0 ? false : (p.active !== undefined ? Boolean(p.active) : true);

        if (p.color && legacyColorMap[p.color]) {
          return {
            ...p,
            name,
            image,
            stock,
            initialStock,
            active,
            color: legacyColorMap[p.color].color,
            textColor: legacyColorMap[p.color].textColor,
          };
        }
        return { ...p, name, image, stock, initialStock, active };
      });

      // Automatically append newly introduced prizes (e.g. Batoh, Čepice) if missing from local storage cache
      const existingIds = new Set(updated.map((p) => p.id));
      let hasAddedNew = false;
      INITIAL_PRIZES.forEach((initPrize) => {
        if (!existingIds.has(initPrize.id)) {
          updated.push(initPrize);
          hasAddedNew = true;
        }
      });

      if (hasAddedNew) {
        saveStoredPrizes(updated);
      }

      return updated;
    }
  } catch (e) {
    console.error('Error loading stored prizes', e);
  }
  return INITIAL_PRIZES;
}

export function saveStoredPrizes(prizes: Prize[]) {
  try {
    safeStorage.setItem(STORAGE_KEYS.PRIZES, JSON.stringify(prizes));
  } catch (e) {
    console.error('Error saving prizes', e);
  }
}

export function getStoredSettings(): SystemSettings {
  try {
    // Check URL parameters for seamless QR code provisioning across all attendee phones
    let urlWebhook: string | null = null;
    let urlRegex: string | null = null;
    if (typeof window !== 'undefined' && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      urlWebhook = params.get('webhook') || params.get('sheet');
      if (params.get('anyEmail') === '1') {
        urlRegex = '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$';
      } else if (params.get('regex')) {
        urlRegex = decodeURIComponent(params.get('regex') || '');
      }
    }

    const data = safeStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (data) {
      const parsed = JSON.parse(data);
      const storedPin = parsed.pin ? String(parsed.pin).trim() : '1008';
      const storedRegex = parsed.allowedEmailRegex ? String(parsed.allowedEmailRegex) : '';
      const emailRegex = storedRegex.includes('o2')
        ? DEFAULT_SETTINGS.allowedEmailRegex
        : (storedRegex || DEFAULT_SETTINGS.allowedEmailRegex);
      const merged: SystemSettings = {
        ...DEFAULT_SETTINGS,
        ...parsed,
        allowedEmailRegex: emailRegex,
        // Auto-migrate legacy 1234 to new requested default 1008
        pin: storedPin === '1234' ? '1008' : storedPin,
        // Auto-migrate legacy quiz settings to 10 questions
        grandPrizeScore: !parsed.grandPrizeScore || parsed.grandPrizeScore < 10 ? 10 : parsed.grandPrizeScore,
        minPassingScore: !parsed.minPassingScore || parsed.minPassingScore < 5 ? 5 : parsed.minPassingScore,
        supabaseUrl: (parsed.supabaseUrl && parsed.supabaseUrl.length > 5) ? parsed.supabaseUrl : DEFAULT_SETTINGS.supabaseUrl,
        supabaseAnonKey: (parsed.supabaseAnonKey && parsed.supabaseAnonKey.length > 15) ? parsed.supabaseAnonKey : DEFAULT_SETTINGS.supabaseAnonKey,
      };

      if (urlWebhook && urlWebhook.startsWith('http')) {
        merged.googleSheetWebhookUrl = urlWebhook.trim();
      } else if (!merged.googleSheetWebhookUrl && DEFAULT_SETTINGS.googleSheetWebhookUrl) {
        merged.googleSheetWebhookUrl = DEFAULT_SETTINGS.googleSheetWebhookUrl;
      }

      if (urlRegex) {
        merged.allowedEmailRegex = urlRegex;
      }

      saveStoredSettings(merged);
      return merged;
    }

    if (urlWebhook && urlWebhook.startsWith('http')) {
      const initialWithUrl: SystemSettings = {
        ...DEFAULT_SETTINGS,
        googleSheetWebhookUrl: urlWebhook.trim(),
        allowedEmailRegex: urlRegex || DEFAULT_SETTINGS.allowedEmailRegex,
      };
      saveStoredSettings(initialWithUrl);
      return initialWithUrl;
    }
  } catch (e) {
    console.error('Error loading settings', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveStoredSettings(settings: SystemSettings) {
  try {
    const rawPin = settings.pin ? String(settings.pin).trim() : '1008';
    const normalized: SystemSettings = {
      ...settings,
      pin: rawPin === '1234' ? '1008' : rawPin,
      updatedAt: settings.updatedAt || Date.now(),
    };
    safeStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(normalized));
  } catch (e) {
    console.error('Error saving settings', e);
  }
}

export function getStoredSpins(): SpinLog[] {
  try {
    const data = safeStorage.getItem(STORAGE_KEYS.SPINS);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Error loading spins', e);
  }
  return [];
}

export function addSpinLog(prize: Prize, userEmail?: string): SpinLog {
  const spins = getStoredSpins();
  const cleanEmail = userEmail ? userEmail.trim().toLowerCase() : undefined;
  const newLog: SpinLog = {
    id: 'spin_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString(),
    prizeId: prize.id,
    prizeName: prize.name,
    userEmail: cleanEmail,
  };
  const updated = [newLog, ...spins];
  try {
    safeStorage.setItem(STORAGE_KEYS.SPINS, JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving spin log', e);
  }
  // Also mirror to IndexedDB for persistent storage across demo mode wipes
  saveSpinToIDB(newLog).catch(() => {});
  return newLog;
}

export function clearSpinLogs() {
  try {
    safeStorage.removeItem(STORAGE_KEYS.SPINS);
  } catch (e) {
    console.error('Error clearing spin logs', e);
  }
  clearSpinsFromIDB().catch(() => {});
}

export function saveStoredSpins(spins: SpinLog[]) {
  try {
    safeStorage.setItem(STORAGE_KEYS.SPINS, JSON.stringify(spins));
  } catch (e) {
    console.error('Error saving stored spins', e);
  }
}

export function resetPrizesToDefault(): Prize[] {
  saveStoredPrizes(INITIAL_PRIZES);
  return INITIAL_PRIZES;
}

// --- Quiz Questions Storage ---
export function getStoredQuestions(): QuizQuestion[] {
  try {
    const data = safeStorage.getItem(STORAGE_KEYS.QUESTIONS);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Error loading questions', e);
  }
  return INITIAL_QUIZ_QUESTIONS;
}

export function saveStoredQuestions(questions: QuizQuestion[]) {
  try {
    safeStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(questions));
  } catch (e) {
    console.error('Error saving questions', e);
  }
}

export function resetQuestionsToDefault(): QuizQuestion[] {
  saveStoredQuestions(INITIAL_QUIZ_QUESTIONS);
  return INITIAL_QUIZ_QUESTIONS;
}

// --- Competition Entries (Emails for Grand Prize) ---
export function getStoredCompetitionEntries(): CompetitionEntry[] {
  try {
    const data = safeStorage.getItem(STORAGE_KEYS.EMAILS);
    if (data) {
      const parsed: CompetitionEntry[] = JSON.parse(data);
      // Strictly ensure only genuine 100% finalists (score >= totalQuestions) are kept
      return parsed.filter((e) => e.score >= (e.totalQuestions || 10));
    }
  } catch (e) {
    console.error('Error loading competition entries', e);
  }
  return [];
}

export function addCompetitionEntry(email: string, score: number, totalQuestions: number): CompetitionEntry {
  // Guard: Only full score (score >= totalQuestions) is eligible for grand prize slosování
  if (score < totalQuestions) {
    throw new Error('Only 100% full quiz score qualifies for grand prize slosování');
  }
  const entries = getStoredCompetitionEntries();
  const newEntry: CompetitionEntry = {
    id: 'entry_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    email: email.trim().toLowerCase(),
    timestamp: new Date().toLocaleString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    score,
    totalQuestions,
  };
  const updated = [newEntry, ...entries];
  try {
    safeStorage.setItem(STORAGE_KEYS.EMAILS, JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving competition entry', e);
  }
  // Also mirror to IndexedDB for persistent storage across demo mode wipes
  saveEntryToIDB(newEntry).catch(() => {});
  return newEntry;
}

export function deleteCompetitionEntry(id: string): CompetitionEntry[] {
  const entries = getStoredCompetitionEntries();
  const updated = entries.filter((e) => e.id !== id);
  try {
    safeStorage.setItem(STORAGE_KEYS.EMAILS, JSON.stringify(updated));
  } catch (e) {
    console.error('Error deleting entry', e);
  }
  deleteEntryFromIDB(id).catch(() => {});
  return updated;
}

export function clearCompetitionEntries() {
  try {
    safeStorage.removeItem(STORAGE_KEYS.EMAILS);
  } catch (e) {
    console.error('Error clearing competition entries', e);
  }
  clearEntriesFromIDB().catch(() => {});
}

export function saveStoredCompetitionEntries(entries: CompetitionEntry[]) {
  try {
    safeStorage.setItem(STORAGE_KEYS.EMAILS, JSON.stringify(entries));
  } catch (e) {
    console.error('Error saving competition entries', e);
  }
}

// Safety check on startup: if demo mode wiped localStorage, recover from IndexedDB
export async function restoreStorageFromIndexedDB(): Promise<{
  restoredEntries: CompetitionEntry[];
  restoredSpins: SpinLog[];
}> {
  try {
    const localEntries = getStoredCompetitionEntries();
    const idbEntries = await getAllEntriesFromIDB();

    // Merge entries by id
    const entryMap = new Map<string, CompetitionEntry>();
    localEntries.forEach((e) => entryMap.set(e.id, e));
    idbEntries.forEach((e) => entryMap.set(e.id, e));
    const mergedEntries = Array.from(entryMap.values());

    if (mergedEntries.length > localEntries.length) {
      safeStorage.setItem(STORAGE_KEYS.EMAILS, JSON.stringify(mergedEntries));
    }

    // Merge spins by id
    const localSpins = getStoredSpins();
    const idbSpins = await getAllSpinsFromIDB();
    const spinMap = new Map<string, SpinLog>();
    localSpins.forEach((s) => spinMap.set(s.id, s));
    idbSpins.forEach((s) => spinMap.set(s.id, s));
    const mergedSpins = Array.from(spinMap.values());

    if (mergedSpins.length > localSpins.length) {
      safeStorage.setItem(STORAGE_KEYS.SPINS, JSON.stringify(mergedSpins));
    }

    return {
      restoredEntries: mergedEntries,
      restoredSpins: mergedSpins,
    };
  } catch (err) {
    console.warn('Could not restore from IndexedDB:', err);
    return {
      restoredEntries: getStoredCompetitionEntries(),
      restoredSpins: getStoredSpins(),
    };
  }
}

// --- Device Lock / Promoter Station Unlock ---
export function isDeviceUnlocked(): boolean {
  try {
    return safeStorage.getItem(STORAGE_KEYS.DEVICE_UNLOCKED) === 'true';
  } catch (e) {
    console.error('Error checking device lock', e);
  }
  return false;
}

export function setDeviceUnlocked(unlocked: boolean) {
  try {
    if (unlocked) {
      safeStorage.setItem(STORAGE_KEYS.DEVICE_UNLOCKED, 'true');
    } else {
      safeStorage.removeItem(STORAGE_KEYS.DEVICE_UNLOCKED);
    }
  } catch (e) {
    console.error('Error setting device lock', e);
  }
}

// --- Participated Emails Tracker (Prevents repeated participation) ---
export function getParticipatedEmails(): string[] {
  try {
    const raw = safeStorage.getItem(STORAGE_KEYS.PARTICIPATED_EMAILS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading participated emails', e);
  }
  return [];
}

export function isEmailAlreadyParticipatedLocally(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const list = getParticipatedEmails();
  if (list.includes(normalized)) return true;

  // Also verify against stored competition entries and spins
  const entries = getStoredCompetitionEntries();
  if (entries.some((e) => e.email.trim().toLowerCase() === normalized)) return true;

  return false;
}

export function markEmailAsParticipated(email: string): void {
  const normalized = email.trim().toLowerCase();
  const current = getParticipatedEmails();
  if (!current.includes(normalized)) {
    const updated = [...current, normalized];
    try {
      safeStorage.setItem(STORAGE_KEYS.PARTICIPATED_EMAILS, JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving participated email', e);
    }
  }
}

export function clearParticipatedEmails(): void {
  try {
    safeStorage.removeItem(STORAGE_KEYS.PARTICIPATED_EMAILS);
  } catch (e) {
    console.error('Error clearing participated emails', e);
  }
}

export function removeParticipatedEmailLocally(email: string): void {
  const normalized = email.trim().toLowerCase();
  const current = getParticipatedEmails();
  const updated = current.filter((e) => e !== normalized);
  try {
    safeStorage.setItem(STORAGE_KEYS.PARTICIPATED_EMAILS, JSON.stringify(updated));
  } catch (e) {
    console.error('Error removing participated email', e);
  }
}

/**
 * Validates whether an email is allowed to enter the competition.
 * Defaults strictly to Vodafone employee domains: @vodafone.cz, @vodafone.com.
 */
export function isAllowedEmail(
  email: string,
  configuredRegex?: string
): { valid: boolean; reason?: string } {
  const clean = (email || '').trim().toLowerCase();
  if (!clean || !clean.includes('@')) {
    return { valid: false, reason: 'Zadejte prosím platný e-mail.' };
  }

  const parts = clean.split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { valid: false, reason: 'Zadejte platný formát e-mailu (např. jmeno.prijmeni@vodafone.cz).' };
  }

  const localPart = parts[0];
  const domain = parts[1];

  // If set to test mode (allows any valid email address)
  if (
    configuredRegex &&
    (configuredRegex.includes('[^@\\s]') ||
      configuredRegex.toLowerCase() === 'any' ||
      configuredRegex.toLowerCase() === 'all')
  ) {
    const isBasicEmail = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(clean);
    return {
      valid: isBasicEmail,
      reason: isBasicEmail ? undefined : 'Zadejte platnou e-mailovou adresu.',
    };
  }

  // Strict Vodafone verification:
  const isVodafoneDomain =
    domain === 'vodafone.cz' ||
    domain === 'vodafone.com' ||
    domain.endsWith('.vodafone.cz') ||
    domain.endsWith('.vodafone.com');

  if (!isVodafoneDomain) {
    return {
      valid: false,
      reason: 'Soutěž je určena pouze pro zaměstnance Vodafone s e-mailem @vodafone.cz nebo @vodafone.com.',
    };
  }

  // Check valid local part
  if (!/^[a-z0-9._%+-]+$/i.test(localPart)) {
    return {
      valid: false,
      reason: 'E-mail obsahuje nepovolené speciální znaky.',
    };
  }

  return { valid: true };
}

