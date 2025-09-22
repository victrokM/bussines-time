import { DateTime } from "luxon";
import { HolidaysProvider } from "./types";
import { BusinessTime } from "../enums/BussinesTime";

export interface BusinessClockDeps {
  holidays: HolidaysProvider;
}

export class BusinessClock {
  constructor(private deps: BusinessClockDeps) {}
  private async isHoliday(dt: DateTime): Promise<boolean> {
    const set = await this.deps.holidays.getHolidaysISO();
    const key = dt.setZone(BusinessTime.TZ).toFormat("yyyy-LL-dd");
    return set.has(key);
  }

  private async isBusinessDay(dt: DateTime): Promise<boolean> {
    const local = dt.setZone(BusinessTime.TZ);
    const weekday = local.weekday;
    if (weekday >= 6) return false;
    if (await this.isHoliday(local)) return false;
    return true;
  }

  private minutesOfDay(dt: DateTime): number {
    const local = dt.setZone(BusinessTime.TZ);
    return local.hour * 60 + local.minute;
  }

  private withMinutesOfDay(base: DateTime, minutes: number): DateTime {
    const local = base.setZone(BusinessTime.TZ);
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return local.set({ hour: h, minute: m, second: 0, millisecond: 0 });
  }

  private async findPrevBusinessDay(dt: DateTime): Promise<DateTime> {
    let cur = dt.minus({ days: 1 });
    while (!(await this.isBusinessDay(cur))) {
      cur = cur.minus({ days: 1 });
    }
    return cur;
  }

  private async findNextBusinessDay(dt: DateTime): Promise<DateTime> {
    let cur = dt.plus({ days: 1 });
    while (!(await this.isBusinessDay(cur))) {
      cur = cur.plus({ days: 1 });
    }
    return cur;
  }

  public async normalizeToPrevWorkInstant(start: DateTime): Promise<DateTime> {
    let cur = start.setZone(BusinessTime.TZ);
    while (!(await this.isBusinessDay(cur))) {
      cur = (await this.findPrevBusinessDay(cur)).set({
        hour: 17,
        minute: 0,
        second: 0,
        millisecond: 0,
      });
    }

    const mod = this.minutesOfDay(cur);

    if (mod >= BusinessTime.AFTERNOON_END) {
      return this.withMinutesOfDay(cur, BusinessTime.AFTERNOON_END);
    }

    if (mod >= BusinessTime.MORNING_END && mod < BusinessTime.AFTERNOON_START) {
      return this.withMinutesOfDay(cur, BusinessTime.MORNING_END);
    }

    if (mod < BusinessTime.MORNING_START) {
      const prev = await this.findPrevBusinessDay(cur);
      return prev.set({ hour: 17, minute: 0, second: 0, millisecond: 0 });
    }

    return cur.set({ second: 0, millisecond: 0 });
  }

  private async nextWorkSegmentStart(dt: DateTime): Promise<DateTime> {
    const mod = this.minutesOfDay(dt);

    if (mod < BusinessTime.MORNING_START) {
      return this.withMinutesOfDay(dt, BusinessTime.MORNING_START);
    }
    if (mod >= BusinessTime.MORNING_START && mod < BusinessTime.MORNING_END) {
      return dt.set({ second: 0, millisecond: 0 });
    }
    if (mod >= BusinessTime.MORNING_END && mod < BusinessTime.AFTERNOON_START) {
      return this.withMinutesOfDay(dt, BusinessTime.AFTERNOON_START);
    }
    if (mod >= BusinessTime.AFTERNOON_START && mod < BusinessTime.AFTERNOON_END) {
      return dt.set({ second: 0, millisecond: 0 });
    }

    const next = await this.findNextBusinessDay(dt);
    return this.withMinutesOfDay(next, BusinessTime.MORNING_START);
  }

  public async addBusinessDays(localStart: DateTime, days: number): Promise<DateTime> {
    let cur = localStart.setZone(BusinessTime.TZ);
    const targetMinutes = this.minutesOfDay(cur);

    for (let i = 0; i < days; i++) {
      cur = await this.findNextBusinessDay(cur);
    }
    let placed = this.withMinutesOfDay(cur, targetMinutes);
    placed = await this.normalizeToPrevWorkInstant(placed);
    return placed;
  }

  public async addBusinessMinutes(localStart: DateTime, minutes: number): Promise<DateTime> {
    let cur = localStart.setZone(BusinessTime.TZ);
    let remaining = minutes;

    while (remaining > 0) {
      cur = await this.nextWorkSegmentStart(cur);
      const mod = this.minutesOfDay(cur);

      let segEnd = 0;
      if (mod >= BusinessTime.MORNING_START && mod < BusinessTime.MORNING_END) {
        segEnd = BusinessTime.MORNING_END;
      } else if (mod >= BusinessTime.AFTERNOON_START && mod < BusinessTime.AFTERNOON_END) {
        segEnd = BusinessTime.AFTERNOON_END;
      } else {
        cur = await this.nextWorkSegmentStart(cur);
        continue;
      }

      const capacity = segEnd - mod;
      const consume = Math.min(capacity, remaining);

      cur = cur.plus({ minutes: consume });
      remaining -= consume;

      if (remaining > 0 && consume === capacity) {
        if (segEnd === BusinessTime.MORNING_END) {
          cur = this.withMinutesOfDay(cur, BusinessTime.AFTERNOON_START);
        } else {
          const next = await this.findNextBusinessDay(cur);
          cur = this.withMinutesOfDay(next, BusinessTime.MORNING_START);
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
    if (!Number.isInteger(days) || !Number.isInteger(hours) || days < 0 || hours < 0) {
      throw new Error("Days and hours must be positive integers");
    }
    if (days === 0 && hours === 0) {
      throw new Error("At least one of days or hours must be provided");
    }

    const baseLocal = utcInput
      ? utcInput.setZone(BusinessTime.TZ)
      : DateTime.now().setZone(BusinessTime.TZ);

    let normalize = await this.normalizeToPrevWorkInstant(baseLocal);

    if (days > 0) normalize = await this.addBusinessDays(normalize, days);

    if (hours > 0) normalize = await this.addBusinessMinutes(normalize, hours * 60);

    return normalize;
  }
}
