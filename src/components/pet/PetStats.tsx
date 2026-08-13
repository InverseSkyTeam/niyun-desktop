import type { PetStats } from "@/lib/petState";

interface PetStatsProps {
    petStats?: PetStats;
}

export function PetStats({ petStats }: PetStatsProps) {
    const hungerPct = Math.round(petStats?.hunger ?? 100);
    const moodPct = Math.round(petStats?.mood ?? 100);

    return (
        <div className="pet-stats">
            <div className="stat">
                <span className="stat-icon">🍣</span>
                <div className="stat-bar">
                    <div className="stat-fill" style={{ width: `${hungerPct}%` }} />
                </div>
            </div>
            <div className="stat">
                <span className="stat-icon">💖</span>
                <div className="stat-bar">
                    <div
                        className="stat-fill mood"
                        style={{ width: `${moodPct}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
