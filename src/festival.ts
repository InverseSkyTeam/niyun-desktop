export interface FestivalConfig {
    name: string;
    particle: string;
    count: number;
    animation: string;
}

export function getFestival(): FestivalConfig | null {
    const now = new Date();
    const m = now.getMonth() + 1;
    const d = now.getDate();

    if ((m === 1 && d >= 20) || (m === 2 && d <= 20)) {
        return { name: "spring", particle: "🧧", count: 12, animation: "festival-fall" };
    }
    if (m === 1 && d === 1) {
        return { name: "newyear", particle: "✨", count: 25, animation: "festival-fall" };
    }

    return null;
}

export function generateParticles(config: FestivalConfig): { left: number; delay: number; duration: number; size: number }[] {
    const particles: { left: number; delay: number; duration: number; size: number }[] = [];
    for (let i = 0; i < config.count; i++) {
        particles.push({
            left: Math.random() * 100,
            delay: Math.random() * 5,
            duration: 4 + Math.random() * 4,
            size: 12 + Math.random() * 10,
        });
    }
    return particles;
}
