export type IsoUtc = string;

export interface QueryInput {
  days?: number;
  hours?: number;
  date?: IsoUtc;
}

export interface SuccessResponse {
  date: IsoUtc;
}

export interface ErrorResponse {
  error: 'InvalidParameters' | 'ServiceUnavailable';
  message: string;
}

export interface HolidaysProvider {
  getHolidaysISO(): Promise<Set<string>>;
}
