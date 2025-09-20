import { HolidaysProvider } from "./types";

const HOLIDAYS_URL = "https://content.capta.co/Recruitment/WorkingDays.json";

export class HttpHolidays implements HolidaysProvider {
  private cache?: { data: Set<string>; expiresAt: number };
  private ttlMs = 60 * 60 * 1000;

  async getHolidaysISO(): Promise<Set<string>> {
    const now = Date.now();
    if (this.cache && this.cache.expiresAt > now) return this.cache.data;

    const res = await fetch(HOLIDAYS_URL);
    if (!res.ok) throw new Error(`Holidays HTTP ${res.status}`);
    const arr: unknown = await res.json();

    if (!Array.isArray(arr) || !arr.every((v) => typeof v === "string")) {
      throw new Error("Holidays API response is not string[]");
    }

    const set = new Set(arr.map((s) => s.trim()));
    this.cache = { data: set, expiresAt: now + this.ttlMs };
    return set;
  }
}