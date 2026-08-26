// Turkish National & Religious holidays for 2026 & 2027
// Dates in YYYY-MM-DD format.
// Sources: Diyanet (religious) + Fixed national holidays.

export type Holiday = { date: string; name: string; type: 'national' | 'religious' };

const HOLIDAYS_2026: Holiday[] = [
  { date: '2026-01-01', name: 'Yılbaşı', type: 'national' },
  { date: '2026-03-20', name: 'Ramazan Bayramı (1. Gün)', type: 'religious' },
  { date: '2026-03-21', name: 'Ramazan Bayramı (2. Gün)', type: 'religious' },
  { date: '2026-03-22', name: 'Ramazan Bayramı (3. Gün)', type: 'religious' },
  { date: '2026-04-23', name: 'Ulusal Egemenlik ve Çocuk Bayramı', type: 'national' },
  { date: '2026-05-01', name: 'Emek ve Dayanışma Günü', type: 'national' },
  { date: '2026-05-19', name: 'Atatürk\'ü Anma, Gençlik ve Spor Bayramı', type: 'national' },
  { date: '2026-05-27', name: 'Kurban Bayramı (1. Gün)', type: 'religious' },
  { date: '2026-05-28', name: 'Kurban Bayramı (2. Gün)', type: 'religious' },
  { date: '2026-05-29', name: 'Kurban Bayramı (3. Gün)', type: 'religious' },
  { date: '2026-05-30', name: 'Kurban Bayramı (4. Gün)', type: 'religious' },
  { date: '2026-07-15', name: 'Demokrasi ve Milli Birlik Günü', type: 'national' },
  { date: '2026-08-30', name: 'Zafer Bayramı', type: 'national' },
  { date: '2026-10-29', name: 'Cumhuriyet Bayramı', type: 'national' },
];

const HOLIDAYS_2027: Holiday[] = [
  { date: '2027-01-01', name: 'Yılbaşı', type: 'national' },
  { date: '2027-03-10', name: 'Ramazan Bayramı (1. Gün)', type: 'religious' },
  { date: '2027-03-11', name: 'Ramazan Bayramı (2. Gün)', type: 'religious' },
  { date: '2027-03-12', name: 'Ramazan Bayramı (3. Gün)', type: 'religious' },
  { date: '2027-04-23', name: 'Ulusal Egemenlik ve Çocuk Bayramı', type: 'national' },
  { date: '2027-05-01', name: 'Emek ve Dayanışma Günü', type: 'national' },
  { date: '2027-05-17', name: 'Kurban Bayramı (1. Gün)', type: 'religious' },
  { date: '2027-05-18', name: 'Kurban Bayramı (2. Gün)', type: 'religious' },
  { date: '2027-05-19', name: 'Kurban Bayramı (3. Gün) / Gençlik ve Spor Bayramı', type: 'religious' },
  { date: '2027-05-20', name: 'Kurban Bayramı (4. Gün)', type: 'religious' },
  { date: '2027-07-15', name: 'Demokrasi ve Milli Birlik Günü', type: 'national' },
  { date: '2027-08-30', name: 'Zafer Bayramı', type: 'national' },
  { date: '2027-10-29', name: 'Cumhuriyet Bayramı', type: 'national' },
];

const ALL: Holiday[] = [...HOLIDAYS_2026, ...HOLIDAYS_2027];
const MAP: Record<string, Holiday> = Object.fromEntries(ALL.map((h) => [h.date, h]));

export function getOfficialHoliday(date: string): Holiday | null {
  return MAP[date] ?? null;
}

export function getHolidaysForMonth(year: number, month: number): Holiday[] {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return ALL.filter((h) => h.date.startsWith(prefix));
}
