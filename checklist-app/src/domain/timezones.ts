import { getNextLocalMidnight } from "./dates";

export const DEFAULT_TIMEZONE = "America/New_York";

export type TimezoneOption = {
  id: string;
  label: string;
  region: string;
};

export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  { id: "America/New_York", label: "New York", region: "United States" },
  { id: "Asia/Kolkata", label: "India", region: "India Standard Time" },
  { id: "Europe/London", label: "United Kingdom", region: "London / UK" },
  { id: "America/Los_Angeles", label: "Los Angeles", region: "United States" },
  { id: "America/Chicago", label: "Chicago", region: "United States" },
  { id: "America/Toronto", label: "Toronto", region: "Canada" },
  { id: "Europe/Paris", label: "Paris", region: "Central Europe" },
  { id: "Asia/Dubai", label: "Dubai", region: "United Arab Emirates" },
  { id: "Asia/Singapore", label: "Singapore", region: "Singapore" },
  { id: "Asia/Tokyo", label: "Tokyo", region: "Japan" },
  { id: "Australia/Sydney", label: "Sydney", region: "Australia" },
  { id: "UTC", label: "UTC", region: "Universal Time" },
];

export function findTimezoneOption(timezone: string): TimezoneOption | undefined {
  return TIMEZONE_OPTIONS.find((option) => option.id === timezone);
}

export function isSupportedTimezone(timezone: string): boolean {
  return Boolean(findTimezoneOption(timezone));
}

export function supportedTimezoneOrDefault(timezone: string | null | undefined): string {
  if (timezone && isSupportedTimezone(timezone)) {
    return timezone;
  }

  return DEFAULT_TIMEZONE;
}

export function formatClockInTimezone(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export function formatNextResetInTimezone(date: Date, timezone: string): string {
  const nextReset = getNextLocalMidnight(date, timezone);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(nextReset);
}
