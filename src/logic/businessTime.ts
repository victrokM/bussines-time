import { DateTime } from 'luxon';

import { HolidaysProvider } from "./types";

const TZ = "America/Bogota";

const MORNING_START = 8 * 60;
const MORNING_END = 12 * 60;
const AFTERNOON_START = 13 * 60;
const AFTERNOON_END = 17 * 60;

export interface BusinessClockDeps {
  holidays: HolidaysProvider;
}

export class BusinessClock {
  constructor(private deps: BusinessClockDeps) {}

  private async isHoliday(dt: DateTime): Promise<boolean> {
    const set = await this.deps.holidays.getHolidaysISO();
    const key = dt.setZone(TZ).toFormat("yyyy-LL-dd");
    return set.has(key);
  }

  private async isBusinessDay(dt: DateTime): Promise<boolean> {
    const local = dt.setZone(TZ);
    const weekday = local.weekday;
    if (weekday >= 6) return false;
    if (await this.isHoliday(local)) return false;
    return true;
  }

  private minutesOfDay(dt: DateTime): number {
    const local = dt.setZone(TZ);
    return local.hour * 60 + local.minute;
  }

  private withMinutesOfDay(base: DateTime, minutes: number): DateTime {
    const local = base.setZone(TZ);
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return local.set({ hour: h, minute: m, second: 0, millisecond: 0 });
  }

  public async normalizeToPrevWorkInstant(start: DateTime): Promise<DateTime> {
    let cur = start.setZone(TZ);

    // Retroceder hasta día hábil
    while (!(await this.isBusinessDay(cur))) {
      cur = cur.minus({ days: 1 }).set({ hour: 17, minute: 0, second: 0, millisecond: 0 });
    }

    const mod = this.minutesOfDay(cur);
    if (mod >= AFTERNOON_END) {
      return this.withMinutesOfDay(cur, AFTERNOON_END);
    }
    if (mod >= MORNING_END && mod < AFTERNOON_START) {
      return this.withMinutesOfDay(cur, MORNING_END); 
    }
    if (mod < MORNING_START) {
      let prev = cur.minus({ days: 1 });
      while (!(await this.isBusinessDay(prev))) {
        prev = prev.minus({ days: 1 });
      }
      return prev.set({ hour: 17, minute: 0, second: 0, millisecond: 0 });
    }
    return cur.set({ second: 0, millisecond: 0 });
  }

  private async nextBusinessDaySameTime(dt: DateTime): Promise<DateTime> {
    let cur = dt.setZone(TZ).plus({ days: 1 });
    while (!(await this.isBusinessDay(cur))) {
      cur = cur.plus({ days: 1 });
    }

    const mod = this.minutesOfDay(cur);
    if (mod >= MORNING_END && mod < AFTERNOON_START) {
      return cur.set({ hour: 12, minute: 0, second: 0, millisecond: 0 });
    }
    return cur;
  }

  private async nextWorkSegmentStart(dt: DateTime): Promise<DateTime> {
    const mod = this.minutesOfDay(dt);
    if (mod < MORNING_START) {
      return this.withMinutesOfDay(dt, MORNING_START);
    }
    if (mod >= MORNING_START && mod < MORNING_END) {
      return dt;
    }
    if (mod >= MORNING_END && mod < AFTERNOON_START) {
      return this.withMinutesOfDay(dt, AFTERNOON_START);
    }
    if (mod >= AFTERNOON_START && mod < AFTERNOON_END) {
      return dt;
    }
    let cur = dt.plus({ days: 1 });
    while (!(await this.isBusinessDay(cur))) {
      cur = cur.plus({ days: 1 });
    }
    return cur.set({ hour: 8, minute: 0, second: 0, millisecond: 0 });
  }

  public async addBusinessDays(localStart: DateTime, days: number): Promise<DateTime> {
    let cur = localStart.setZone(TZ);
    for (let i = 0; i < days; i++) {
      cur = await this.nextBusinessDaySameTime(cur);
    }
    return cur;
  }

  public async addBusinessMinutes(localStart: DateTime, minutes: number): Promise<DateTime> {
    let cur = localStart.setZone(TZ);
    let remaining = minutes;

    while (remaining > 0) {
      cur = await this.nextWorkSegmentStart(cur);
      const mod = this.minutesOfDay(cur);

      let segEnd = 0;
      if (mod >= MORNING_START && mod < MORNING_END) segEnd = MORNING_END;
      else if (mod >= AFTERNOON_START && mod < AFTERNOON_END) segEnd = AFTERNOON_END;
      else if (mod >= MORNING_END && mod < AFTERNOON_START) {
        cur = this.withMinutesOfDay(cur, AFTERNOON_START);
        continue;
      } else if (mod >= AFTERNOON_END) {
        cur = await this.nextWorkSegmentStart(cur);
        continue;
      } else {
        cur = this.withMinutesOfDay(cur, MORNING_START);
        continue;
      }

      const capacity = segEnd - mod;
      const consume = Math.min(capacity, remaining);
      cur = cur.plus({ minutes: consume });
      remaining -= consume;

      if (remaining > 0 && consume === capacity) {
        if (segEnd === MORNING_END) {
          cur = this.withMinutesOfDay(cur, AFTERNOON_START);
        } else if (segEnd === AFTERNOON_END) {
          cur = await this.nextWorkSegmentStart(cur);
        }
      }
    }
    return cur;
  }

  public async compute({
    utcInput,
    days,
    hours,
  }: {
    utcInput?: DateTime;
    days: number;
    hours: number;
  }): Promise<DateTime> {
    const baseLocal = utcInput
      ? utcInput.setZone(TZ)
      : DateTime.now().setZone(TZ);

    let t = await this.normalizeToPrevWorkInstant(baseLocal);

    if (days > 0) t = await this.addBusinessDays(t, days);
    if (hours > 0) t = await this.addBusinessMinutes(t, hours * 60);

    return t;
  }
}
