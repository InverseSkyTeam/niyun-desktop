import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

const aiFetch: typeof fetch =
    typeof window !== "undefined" && "__TAURI_INTERNALS__" in window
        ? tauriFetch
        : window.fetch.bind(window);

const WTTR_ENDPOINT = "https://wttr.in/?format=j1";

export type WeatherKind =
    | "clear"
    | "cloudy"
    | "rain"
    | "snow"
    | "thunder"
    | "fog"
    | "sandstorm"
    | "unknown";

export interface WeatherParticle {
    left: number;
    delay: number;
    duration: number;
    size: number;
}

export interface WeatherCG {
    kind: WeatherKind;
    label: string;
    description: string;
    particle: string;
    count: number;
    animation:
        | "weather-fall"
        | "weather-fall-slow"
        | "weather-fall-fast"
        | "weather-flash"
        | "weather-drift";
    city: string;
    temperature: number;
    weather: string;
}

export interface WeatherSummary {
    city: string;
    weather: string;
    temperature: number;
    wind_direction: string;
    wind_power: string;
    humidity: number;
    report_time: string;
}

export interface WeatherSnapshot {
    summary: WeatherSummary | null;
    cg: WeatherCG | null;
    fetchedAt: number;
}


function classifyByWmoCode(code: number): WeatherKind {
    if (code === 113) return "clear";
    if (code >= 116 && code <= 122) return "cloudy";
    if (code === 143 || code === 248 || code === 260) return "fog";
    if (code === 200 || (code >= 386 && code <= 395)) return "thunder";
    if (code === 176 || (code >= 263 && code <= 284) || (code >= 293 && code <= 314) || (code >= 353 && code <= 359)) {
        return "rain";
    }
    if ((code >= 179 && code <= 182) || (code >= 227 && code <= 230) || (code >= 317 && code <= 350) || (code >= 362 && code <= 377)) {
        return "snow";
    }
    return "unknown";
}

function classifyByText(text: string): WeatherKind {
    const t = text.trim().toLowerCase();
    if (!t) return "unknown";
    if (/thunder|雷|闪电/.test(t)) return "thunder";
    if (/snow|sleet|blizzard|冰雹|雪/.test(t)) return "snow";
    if (/rain|drizzle|雨/.test(t)) return "rain";
    if (/fog|mist|haze|雾|霾|沙|扬/.test(t)) return "fog";
    if (/overcast|cloudy|阴|云/.test(t)) return "cloudy";
    if (/sunny|clear|晴/.test(t)) return "clear";
    return "unknown";
}

export function classifyWeather(
    weatherText: string,
    wmoCode: number | string | undefined,
): WeatherKind {
    if (wmoCode !== undefined) {
        const n = typeof wmoCode === "string" ? parseInt(wmoCode, 10) : wmoCode;
        if (!Number.isNaN(n)) {
            const k = classifyByWmoCode(n);
            if (k !== "unknown") return k;
        }
    }
    return classifyByText(weatherText);
}

const KIND_CONFIG: Record<
    WeatherKind,
    {
        particle: string;
        count: number;
        animation: WeatherCG["animation"];
        label: string;
    }
> = {
    clear: {
        particle: "✨",
        count: 6,
        animation: "weather-fall-slow",
        label: "晴天",
    },
    cloudy: {
        particle: "☁️",
        count: 5,
        animation: "weather-drift",
        label: "多云",
    },
    rain: {
        particle: "💧",
        count: 22,
        animation: "weather-fall",
        label: "下雨",
    },
    snow: {
        particle: "❄️",
        count: 18,
        animation: "weather-fall-slow",
        label: "下雪",
    },
    thunder: {
        particle: "⚡",
        count: 8,
        animation: "weather-flash",
        label: "雷雨",
    },
    fog: {
        particle: "🌫️",
        count: 4,
        animation: "weather-drift",
        label: "雾霾",
    },
    sandstorm: {
        particle: "🟤",
        count: 12,
        animation: "weather-fall-fast",
        label: "沙尘",
    },
    unknown: {
        particle: "",
        count: 0,
        animation: "weather-fall-slow",
        label: "未知",
    },
};


interface WttrResponse {
    current_condition?: {
        weatherCode?: string;
        weatherDesc?: { value?: string }[];
        temp_C?: string;
        humidity?: string;
        winddir16Point?: string;
        windspeedKmph?: string;
        observation_time?: string;
    }[];
    nearest_area?: {
        areaName?: { value?: string }[];
        region?: { value?: string }[];
    }[];
}

function parseWttr(data: WttrResponse): { summary: WeatherSummary | null; kind: WeatherKind } {
    const cur = data.current_condition?.[0];
    const area = data.nearest_area?.[0];
    if (!cur || (cur.temp_C === undefined && !cur.weatherDesc?.[0]?.value)) {
        return { summary: null, kind: "unknown" };
    }
    const weatherText = cur.weatherDesc?.[0]?.value ?? "未知";
    const code = cur.weatherCode !== undefined ? parseInt(cur.weatherCode, 10) : undefined;
    const kind = classifyWeather(weatherText, code);
    const city = area?.areaName?.[0]?.value || area?.region?.[0]?.value || "未知城市";
    const temperature = cur.temp_C !== undefined ? Number(cur.temp_C) : Number.NaN;
    return {
        summary: {
            city,
            weather: weatherText,
            temperature,
            wind_direction: cur.winddir16Point || "",
            wind_power: cur.windspeedKmph ? `${cur.windspeedKmph}km/h` : "",
            humidity: cur.humidity !== undefined ? Number(cur.humidity) : Number.NaN,
            report_time: cur.observation_time || "",
        },
        kind,
    };
}

function buildCG(summary: WeatherSummary | null, kind: WeatherKind): WeatherCG | null {
    if (!summary || kind === "unknown" || !KIND_CONFIG[kind].particle) return null;
    const cfg = KIND_CONFIG[kind];
    const tempDesc =
        summary.temperature >= 30
            ? "热得发昏"
            : summary.temperature >= 20
              ? "挺舒服"
              : summary.temperature >= 10
                ? "有点凉"
                : summary.temperature >= 0
                  ? "冷飕飕"
                  : "冻死啦";
    return {
        kind,
        label: cfg.label,
        description: `${summary.city}：${cfg.label}，${Math.round(summary.temperature)}°C（${tempDesc}）`,
        particle: cfg.particle,
        count: cfg.count,
        animation: cfg.animation,
        city: summary.city,
        temperature: summary.temperature,
        weather: cfg.label,
    };
}

export async function fetchWeather(): Promise<WeatherSnapshot> {
    try {
        const res = await aiFetch(WTTR_ENDPOINT);
        if (!res.ok) throw new Error(`wttr.in HTTP ${res.status}`);
        const data = (await res.json()) as WttrResponse;
        const { summary, kind } = parseWttr(data);
        return {
            summary,
            cg: buildCG(summary, kind),
            fetchedAt: Date.now(),
        };
    } catch {
        return { summary: null, cg: null, fetchedAt: Date.now() };
    }
}

export function generateWeatherParticles(cg: WeatherCG): WeatherParticle[] {
    const arr: WeatherParticle[] = [];
    for (let i = 0; i < cg.count; i++) {
        const sizeBase = cg.kind === "rain" ? 8 : cg.kind === "snow" ? 12 : 16;
        const sizeRand = 4;
        arr.push({
            left: Math.random() * 100,
            delay: Math.random() * (cg.kind === "thunder" ? 3 : 5),
            duration:
                cg.kind === "rain"
                    ? 0.8 + Math.random() * 0.6
                    : cg.kind === "snow"
                      ? 4 + Math.random() * 3
                      : cg.kind === "thunder"
                        ? 0.5 + Math.random() * 0.4
                        : 4 + Math.random() * 3,
            size: sizeBase + Math.random() * sizeRand,
        });
    }
    return arr;
}
