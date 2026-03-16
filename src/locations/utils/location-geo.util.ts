import type { Location, LocationTiming } from "../../models/location.model.js";

export const SAUDI_TIMEZONE = "Asia/Riyadh";

export function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function parseLocationCoords(loc: Location): { lat: number; lng: number } | null {
  const lat = Number(loc.location_latitude);
  const lng = Number(loc.location_longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function parseHHMMToMinutes(hhmm: string): number | null {
  const m = String(hhmm).match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

export interface TodayHoursInfo {
  timezone: string;
  now_iso: string;
  today_day: string; // Monday/Tuesday...
  today_status: "OPEN" | "CLOSED" | "UNKNOWN";
  today_shifts: Array<{ open: string; close: string }>;
  open_now: boolean;
  current_shift?: { open: string; close: string };
}

export function getSaudiNow(): Date {
  // Date is always UTC internally; we only use timezone formatting for day/time.
  return new Date();
}

export function getSaudiWeekdayName(now: Date): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: SAUDI_TIMEZONE }).format(now);
}

export function getSaudiTimeMinutes(now: Date): number {
  const hh = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: SAUDI_TIMEZONE }).format(now);
  const mm = new Intl.DateTimeFormat("en-GB", { minute: "2-digit", hour12: false, timeZone: SAUDI_TIMEZONE }).format(now);
  return Number(hh) * 60 + Number(mm);
}

export function computeTodayHours(timings: LocationTiming[] | undefined, now: Date): TodayHoursInfo {
  const today_day = getSaudiWeekdayName(now);
  const nowMinutes = getSaudiTimeMinutes(now);

  const info: TodayHoursInfo = {
    timezone: SAUDI_TIMEZONE,
    now_iso: now.toISOString(),
    today_day,
    today_status: "UNKNOWN",
    today_shifts: [],
    open_now: false,
  };

  if (!timings || timings.length === 0) return info;
  const today = timings.find((t) => t.day === today_day);
  if (!today) return info;

  // isClosed is authoritative
  if (today.isClosed === true) {
    info.today_status = "CLOSED";
    info.today_shifts = (today.shifts || []).map((s) => ({ open: s.open, close: s.close }));
    info.open_now = false;
    return info;
  }

  const shifts = (today.shifts || []).map((s) => ({ open: s.open, close: s.close }));
  info.today_shifts = shifts;
  info.today_status = shifts.length > 0 ? "OPEN" : "UNKNOWN";

  for (const s of shifts) {
    const openMin = parseHHMMToMinutes(s.open);
    const closeMin = parseHHMMToMinutes(s.close);
    if (openMin === null || closeMin === null) continue;

    // Same-day shift only (assumption)
    if (nowMinutes >= openMin && nowMinutes <= closeMin) {
      info.open_now = true;
      info.current_shift = { open: s.open, close: s.close };
      return info;
    }
  }

  info.open_now = false;
  return info;
}

