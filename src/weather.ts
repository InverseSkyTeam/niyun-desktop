import { UapiClient } from 'uapi-browser-sdk';

const uapi = new UapiClient('https://uapis.cn', 'uapi-_ibhj0ggpbpLj0AHTvsiGbFjxsyP_D3TOJg3ryUI');

export type WeatherKind = "clear" | "cloudy" | "rain" | "snow" | "thunder" | "fog" | "sandstorm" | "unknown";

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
    animation: "weather-fall" | "weather-fall-slow" | "weather-fall-fast" | "weather-flash" | "weather-drift";
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

interface RawWeatherResponse {
    city?: string;
    district?: string;
    adcode?: string;
    weather?: string;
    weather_icon?: number | string;
    temperature?: number;
    wind_direction?: string;
    wind_power?: string;
    humidity?: number;
    report_time?: string;
    precipitation?: number;
}

function classifyByIcon(icon: number): WeatherKind {
    if (icon === 100) return "clear";
    if (icon >= 101 && icon <= 103) return "cloudy";
    if (icon >= 104 && icon <= 213) return "cloudy";
    if (icon === 301 || (icon >= 305 && icon <= 318)) return "rain";
    if (icon === 302 || icon === 303 || icon === 304) return "thunder";
    if (icon === 399) return "rain";
    if ((icon >= 400 && icon <= 408) || icon === 499) return "snow";
    if (icon >= 500 && icon <= 515) return "fog";
    if (icon >= 900) return "sandstorm";
    return "unknown";
}

function classifyByText(text: string): WeatherKind {
    const t = text.trim();
    if (!t) return "unknown";
    if (t.includes("雷") || t.includes("闪电")) return "thunder";
    if (t.includes("雪")) return "snow";
    if (t.includes("雨")) return "rain";
    if (t.includes("雾") || t.includes("霾") || t.includes("沙") || t.includes("扬")) return "fog";
    if (t.includes("阴") || t.includes("云")) return "cloudy";
    if (t.includes("晴")) return "clear";
    return "unknown";
}

export function classifyWeather(weatherText: string, icon: number | string | undefined): WeatherKind {
    if (icon !== undefined) {
        const n = typeof icon === "string" ? parseInt(icon, 10) : icon;
        if (!Number.isNaN(n)) {
            const k = classifyByIcon(n);
            if (k !== "unknown") return k;
        }
    }
    return classifyByText(weatherText);
}

const KIND_CONFIG: Record<WeatherKind, { particle: string; count: number; animation: WeatherCG["animation"]; label: string }> = {
    clear: { particle: "✨", count: 6, animation: "weather-fall-slow", label: "晴天" },
    cloudy: { particle: "☁️", count: 5, animation: "weather-drift", label: "多云" },
    rain: { particle: "💧", count: 22, animation: "weather-fall", label: "下雨" },
    snow: { particle: "❄️", count: 18, animation: "weather-fall-slow", label: "下雪" },
    thunder: { particle: "⚡", count: 8, animation: "weather-flash", label: "雷雨" },
    fog: { particle: "🌫️", count: 4, animation: "weather-drift", label: "雾霾" },
    sandstorm: { particle: "🟤", count: 12, animation: "weather-fall-fast", label: "沙尘" },
    unknown: { particle: "", count: 0, animation: "weather-fall-slow", label: "未知" },
};

function buildSummary(raw: RawWeatherResponse): WeatherSummary | null {
    if (!raw.weather && raw.temperature === undefined) return null;
    return {
        city: raw.city || raw.district || "未知城市",
        weather: raw.weather || "未知",
        temperature: typeof raw.temperature === "number" ? raw.temperature : Number(raw.temperature ?? NaN),
        wind_direction: raw.wind_direction || "",
        wind_power: raw.wind_power || "",
        humidity: typeof raw.humidity === "number" ? raw.humidity : Number(raw.humidity ?? NaN),
        report_time: raw.report_time || "",
    };
}

function buildCG(raw: RawWeatherResponse, kind: WeatherKind): WeatherCG | null {
    if (kind === "unknown" || !KIND_CONFIG[kind].particle) return null;
    const cfg = KIND_CONFIG[kind];
    const summary = buildSummary(raw);
    if (!summary) return null;
    const tempDesc = summary.temperature >= 30 ? "热得发昏" :
                     summary.temperature >= 20 ? "挺舒服" :
                     summary.temperature >= 10 ? "有点凉" :
                     summary.temperature >= 0  ? "冷飕飕" : "冻死啦";
    return {
        kind,
        label: cfg.label,
        description: `${summary.city}：${summary.weather}，${summary.temperature}°C（${tempDesc}）`,
        particle: cfg.particle,
        count: cfg.count,
        animation: cfg.animation,
        city: summary.city,
        temperature: summary.temperature,
        weather: summary.weather,
    };
}

export async function fetchWeather(): Promise<WeatherSnapshot> {
    try {
        const data = await uapi.misc.getMiscWeather({
            extended: false,
            forecast: false,
            hourly: false,
            minutely: false,
            indices: false,
            lang: "zh",
        });
        const raw = data as unknown as RawWeatherResponse;
        const kind = classifyWeather(raw.weather ?? "", raw.weather_icon);
        return {
            summary: buildSummary(raw),
            cg: buildCG(raw, kind),
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
            duration: cg.kind === "rain" ? 0.8 + Math.random() * 0.6
                : cg.kind === "snow" ? 4 + Math.random() * 3
                : cg.kind === "thunder" ? 0.5 + Math.random() * 0.4
                : 4 + Math.random() * 3,
            size: sizeBase + Math.random() * sizeRand,
        });
    }
    return arr;
}
