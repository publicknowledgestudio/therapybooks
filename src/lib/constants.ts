export type WorkingHours = Record<
  string,
  { start: string; end: string; enabled: boolean }
>;

export const DEFAULT_WORKING_HOURS: WorkingHours = {
  mon: { start: "09:00", end: "18:00", enabled: true },
  tue: { start: "09:00", end: "18:00", enabled: true },
  wed: { start: "09:00", end: "18:00", enabled: true },
  thu: { start: "09:00", end: "18:00", enabled: true },
  fri: { start: "09:00", end: "18:00", enabled: true },
  sat: { start: "09:00", end: "13:00", enabled: false },
  sun: { start: "09:00", end: "13:00", enabled: false },
};
