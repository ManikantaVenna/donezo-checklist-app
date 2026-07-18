import { getNextLocalMidnight } from "./dates";

export const DEFAULT_TIMEZONE = "America/New_York";

export type TimezoneOption = {
  id: string;
  label: string;
  region: string;
  keywords?: string[];
};

export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  { id: "America/New_York", label: "New York", region: "United States", keywords: ["eastern", "est", "edt", "usa"] },
  { id: "America/Los_Angeles", label: "Los Angeles", region: "United States", keywords: ["pacific", "pst", "pdt", "usa"] },
  { id: "America/Chicago", label: "Chicago", region: "United States", keywords: ["central", "cst", "cdt", "usa"] },
  { id: "America/Denver", label: "Denver", region: "United States", keywords: ["mountain", "mst", "mdt", "usa"] },
  { id: "America/Phoenix", label: "Phoenix", region: "United States", keywords: ["arizona", "mst", "usa"] },
  { id: "America/Anchorage", label: "Anchorage", region: "United States", keywords: ["alaska", "usa"] },
  { id: "Pacific/Honolulu", label: "Honolulu", region: "United States", keywords: ["hawaii", "usa"] },
  { id: "America/Toronto", label: "Toronto", region: "Canada", keywords: ["eastern", "canada"] },
  { id: "America/Vancouver", label: "Vancouver", region: "Canada", keywords: ["pacific", "canada"] },
  { id: "America/Mexico_City", label: "Mexico City", region: "Mexico", keywords: ["mexico"] },
  { id: "America/Bogota", label: "Bogotá", region: "Colombia / Peru", keywords: ["colombia", "peru", "lima"] },
  { id: "America/Lima", label: "Lima", region: "Peru", keywords: ["peru"] },
  { id: "America/Santiago", label: "Santiago", region: "Chile", keywords: ["chile"] },
  { id: "America/Argentina/Buenos_Aires", label: "Buenos Aires", region: "Argentina", keywords: ["argentina"] },
  { id: "America/Sao_Paulo", label: "São Paulo", region: "Brazil", keywords: ["brazil", "sao paulo"] },
  { id: "UTC", label: "UTC", region: "Universal Time", keywords: ["gmt", "zulu"] },
  { id: "Europe/London", label: "United Kingdom", region: "London / UK", keywords: ["london", "uk", "britain", "england", "gmt", "bst"] },
  { id: "Europe/Dublin", label: "Dublin", region: "Ireland", keywords: ["ireland"] },
  { id: "Europe/Paris", label: "Paris", region: "France / Central Europe", keywords: ["france", "cet", "cest"] },
  { id: "Europe/Berlin", label: "Berlin", region: "Germany / Central Europe", keywords: ["germany", "cet", "cest"] },
  { id: "Europe/Madrid", label: "Madrid", region: "Spain", keywords: ["spain"] },
  { id: "Europe/Rome", label: "Rome", region: "Italy", keywords: ["italy"] },
  { id: "Europe/Amsterdam", label: "Amsterdam", region: "Netherlands", keywords: ["netherlands", "holland"] },
  { id: "Europe/Zurich", label: "Zurich", region: "Switzerland", keywords: ["switzerland"] },
  { id: "Europe/Stockholm", label: "Stockholm", region: "Sweden / Nordics", keywords: ["sweden", "nordic"] },
  { id: "Europe/Warsaw", label: "Warsaw", region: "Poland", keywords: ["poland"] },
  { id: "Europe/Athens", label: "Athens", region: "Greece / Eastern Europe", keywords: ["greece", "eet"] },
  { id: "Europe/Istanbul", label: "Istanbul", region: "Türkiye", keywords: ["turkey", "turkiye"] },
  { id: "Africa/Cairo", label: "Cairo", region: "Egypt", keywords: ["egypt"] },
  { id: "Africa/Lagos", label: "Lagos", region: "Nigeria / West Africa", keywords: ["nigeria", "west africa"] },
  { id: "Africa/Johannesburg", label: "Johannesburg", region: "South Africa", keywords: ["south africa"] },
  { id: "Asia/Dubai", label: "Dubai", region: "United Arab Emirates", keywords: ["uae", "gst"] },
  { id: "Asia/Riyadh", label: "Riyadh", region: "Saudi Arabia", keywords: ["saudi"] },
  { id: "Asia/Jerusalem", label: "Jerusalem", region: "Israel", keywords: ["israel"] },
  { id: "Asia/Kolkata", label: "India", region: "India Standard Time", keywords: ["india", "mumbai", "delhi", "ist"] },
  { id: "Asia/Karachi", label: "Karachi", region: "Pakistan", keywords: ["pakistan"] },
  { id: "Asia/Dhaka", label: "Dhaka", region: "Bangladesh", keywords: ["bangladesh"] },
  { id: "Asia/Bangkok", label: "Bangkok", region: "Thailand / Vietnam", keywords: ["thailand", "vietnam"] },
  { id: "Asia/Jakarta", label: "Jakarta", region: "Indonesia", keywords: ["indonesia"] },
  { id: "Asia/Singapore", label: "Singapore", region: "Singapore", keywords: ["sgt"] },
  { id: "Asia/Shanghai", label: "Shanghai", region: "China", keywords: ["china", "beijing", "cst"] },
  { id: "Asia/Hong_Kong", label: "Hong Kong", region: "Hong Kong", keywords: ["hkt"] },
  { id: "Asia/Taipei", label: "Taipei", region: "Taiwan", keywords: ["taiwan"] },
  { id: "Asia/Seoul", label: "Seoul", region: "South Korea", keywords: ["korea"] },
  { id: "Asia/Tokyo", label: "Tokyo", region: "Japan", keywords: ["japan", "jst"] },
  { id: "Australia/Perth", label: "Perth", region: "Australia", keywords: ["western australia"] },
  { id: "Australia/Adelaide", label: "Adelaide", region: "Australia", keywords: ["south australia"] },
  { id: "Australia/Sydney", label: "Sydney", region: "Australia", keywords: ["australia", "melbourne"] },
  { id: "Pacific/Auckland", label: "Auckland", region: "New Zealand", keywords: ["new zealand", "nz"] },
];

export function findTimezoneOption(timezone: string): TimezoneOption | undefined {
  return TIMEZONE_OPTIONS.find((option) => option.id === timezone);
}

export function isSupportedTimezone(timezone: string): boolean {
  return Boolean(findTimezoneOption(timezone));
}

export function filterTimezoneOptions(query: string): TimezoneOption[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return TIMEZONE_OPTIONS;

  return TIMEZONE_OPTIONS.filter((option) => {
    const searchable = [option.id, option.label, option.region, ...(option.keywords ?? [])]
      .map(normalizeSearchText)
      .join(" ");
    return searchable.includes(normalizedQuery);
  });
}

export function supportedTimezoneOrDefault(timezone: string | null | undefined): string {
  if (timezone && isSupportedTimezone(timezone)) {
    return timezone;
  }

  return DEFAULT_TIMEZONE;
}

export function millisecondsUntilNextMinute(date: Date): number {
  return 60_000 - date.getSeconds() * 1_000 - date.getMilliseconds() + 25;
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

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
