import type { Mood } from "@/lib/petState";

export interface Particle {
    left: number;
    delay: number;
    duration: number;
    size: number;
}

interface PetSpriteProps {
    mood: Mood;
    isSleeping: boolean;
    lowStatType: "hunger" | "mood" | null;
    eating: boolean;
    eatBone: boolean;
    moodZero: boolean;
    rainDrops: Particle[];
}

export function PetSprite({
    mood,
    isSleeping,
    lowStatType,
    eating,
    eatBone,
    moodZero,
    rainDrops,
}: PetSpriteProps) {
    return (
        <>
            <div
                className={[
                    "pet-mood",
                    `mood-${mood}`,
                    isSleeping ? "sleeping" : "",
                    lowStatType ? "low-stat" : "",
                ]
                    .filter(Boolean)
                    .join(" ")}
            >
                <div className="pet-img" />
            </div>

            {isSleeping && (
                <div className="cg-sleep">
                    <span className="zzz z1">z</span>
                    <span className="zzz z2">Z</span>
                    <span className="zzz z3">Z</span>
                </div>
            )}

            {lowStatType && (
                <div className="cg-lowstat">
                    <span className="lowstat-icon">
                        {lowStatType === "hunger" ? "💢" : "💧"}
                    </span>
                </div>
            )}

            {eating && (
                <div className="cg-eat">
                    <span className={eatBone ? "eat-icon bone" : "eat-icon"}>
                        {eatBone ? "🦴" : "🐟"}
                    </span>
                </div>
            )}

            {moodZero && <div className="mood-zero-overlay" />}
            {moodZero && (
                <div className="mood-zero-rain">
                    {rainDrops.map((d, i) => (
                        <span
                            key={i}
                            className="rain-drop"
                            style={{
                                left: `${d.left}%`,
                                animationDelay: `${d.delay}s`,
                                animationDuration: `${d.duration}s`,
                                fontSize: `${d.size}px`,
                            }}
                        >
                            💧
                        </span>
                    ))}
                </div>
            )}
        </>
    );
}
