import { useEffect, useMemo, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { emit } from "@tauri-apps/api/event";
import { usePetStore } from "@/stores/petStore";
import { usePetSync } from "@/hooks/usePetEvents";
import { getFestival, generateParticles } from "@/lib/festival";
import { generateWeatherParticles } from "@/lib/weather";
import type { Mood, PetStats } from "@/lib/petState";
import { PetSprite, type Particle } from "./PetSprite";
import { PetStats as PetStatsBars } from "./PetStats";
import { SpeechBubble } from "./SpeechBubble";
import { PetContextMenu } from "./PetContextMenu";
import { usePetPassthrough } from "./usePetPassthrough";
import { usePetSpeech } from "./usePetSpeech";
import { isTauri } from "@/lib/tauri";
import "./pet-overlay.css";

const MENU_WIDTH = 130;
const RAIN_DROP_COUNT = 35;
const MENU_MAX_HEIGHT = 200;

function getLowStatType(stats?: PetStats): "hunger" | "mood" | null {
    if (!stats) return null;
    if (stats.hunger < 20) return "hunger";
    if (stats.mood < 20) return "mood";
    return null;
}

function particleStyle(p: Particle): React.CSSProperties {
    return {
        left: `${p.left}%`,
        animationDelay: `${p.delay}s`,
        animationDuration: `${p.duration}s`,
        fontSize: `${p.size}px`,
    };
}

function clampMenuPos(clientX: number, clientY: number): { x: number; y: number } {
    const maxH = window.innerHeight - 20;
    const menuH = Math.min(MENU_MAX_HEIGHT, maxH);
    const x = Math.min(clientX, window.innerWidth - MENU_WIDTH - 4);
    const y = Math.max(4, Math.min(clientY, window.innerHeight - menuH - 4));
    return { x, y };
}


function ParticleOverlay({
    className,
    spanClass,
    particleChar,
    animation,
    particles,
    keyPrefix,
}: {
    className: string;
    spanClass: string;
    particleChar: string;
    animation: string;
    particles: Particle[];
    keyPrefix: string;
}) {
    return (
        <div className={className}>
            {particles.map((p, i) => (
                <span
                    key={`${keyPrefix}${i}`}
                    className={`${spanClass} ${animation}`}
                    style={particleStyle(p)}
                >
                    {particleChar}
                </span>
            ))}
        </div>
    );
}

export function PetOverlay() {
    usePetSync();

    const petMood = usePetStore((s) => s.petMood);
    const petStats = usePetStore((s) => s.petStats);
    const isSleeping = usePetStore((s) => s.isSleeping);
    const eating = usePetStore((s) => s.eating);
    const weatherCG = usePetStore((s) => s.weatherCG);

    const [squishing, setSquishing] = useState(false);
    const [eatBone, setEatBone] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);
    const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
    const [localMood, setLocalMood] = useState<Mood | null>(null);

    const petAreaRef = usePetPassthrough(() => menuVisible);
    const { speech, dismiss } = usePetSpeech();

    const win = useMemo(() => {
        try {
            return getCurrentWindow();
        } catch {
            return null;
        }
    }, []);

    const eatTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
    const localMoodTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
    const moveDebounce = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(() => {
        return () => {
            eatTimers.current.forEach(clearTimeout);
            if (localMoodTimer.current) clearTimeout(localMoodTimer.current);
            if (moveDebounce.current) clearTimeout(moveDebounce.current);
        };
    }, []);

    const displayMood: Mood = localMood ?? petMood ?? "neutral";
    const lowStatType = getLowStatType(petStats);
    const moodZero = (petStats?.mood ?? 100) <= 0;

    const festival = useMemo(() => getFestival(), []);
    const particles = useMemo(
        () => (festival ? generateParticles(festival) : []),
        [festival],
    );
    const weatherParticles = useMemo(
        () => (weatherCG ? generateWeatherParticles(weatherCG) : []),
        [weatherCG],
    );
    const rainDrops = useMemo<Particle[]>(() => {
        if (!moodZero) return [];
        return Array.from({ length: RAIN_DROP_COUNT }, () => ({
            left: Math.random() * 100,
            delay: Math.random() * 3,
            duration: 0.6 + Math.random() * 0.8,
            size: 10 + Math.random() * 8,
        }));
    }, [moodZero]);

    function emitInteract(action: "feed" | "pet" | "peek") {
        if (isTauri()) emit("pet-interact", action);
    }

    function startEatAnimation() {
        eatTimers.current.forEach(clearTimeout);
        eatTimers.current = [];
        setEatBone(false);
        eatTimers.current.push(
            setTimeout(() => setEatBone(true), 2000),
            setTimeout(() => setEatBone(false), 4000),
        );
    }

    function feedPet() {
        emitInteract("feed");
        setMenuVisible(false);
        startEatAnimation();
    }

    function openMenu(e: React.MouseEvent) {
        e.preventDefault();
        setMenuVisible(true);
        setMenuPos(clampMenuPos(e.clientX, e.clientY));
    }

    function squishPet() {
        setSquishing(true);
        setLocalMood("shy");
        if (localMoodTimer.current) clearTimeout(localMoodTimer.current);
        localMoodTimer.current = setTimeout(() => setLocalMood(null), 3000);
        emitInteract("pet");
        void win?.startDragging();
        if (moveDebounce.current) clearTimeout(moveDebounce.current);
        moveDebounce.current = setTimeout(() => setSquishing(false), 150);
    }

    function onPetMouseDown(e: React.MouseEvent) {
        if (e.button === 0) squishPet();
    }

    return (
        <div
            className="pet-overlay-root"
            onMouseDown={() => setMenuVisible(false)}
        >
            {particles.length > 0 && festival && (
                <ParticleOverlay
                    className="festival-overlay"
                    spanClass="festival-particle"
                    particleChar={festival.particle}
                    animation={festival.animation}
                    particles={particles}
                    keyPrefix=""
                />
            )}

            {weatherCG && weatherParticles.length > 0 && (
                <ParticleOverlay
                    className="weather-overlay"
                    spanClass="weather-particle"
                    particleChar={weatherCG.particle}
                    animation={weatherCG.animation}
                    particles={weatherParticles}
                    keyPrefix="w"
                />
            )}

            <div
                ref={petAreaRef}
                className={squishing ? "pet-area squishing" : "pet-area"}
                onMouseDown={onPetMouseDown}
                onContextMenu={openMenu}
                onClick={() => setMenuVisible(false)}
            >
                <SpeechBubble
                    text={speech.text}
                    visible={speech.visible}
                    onClose={dismiss}
                />

                <PetSprite
                    mood={displayMood}
                    isSleeping={isSleeping}
                    lowStatType={lowStatType}
                    eating={eating}
                    eatBone={eatBone}
                    moodZero={moodZero}
                    rainDrops={rainDrops}
                />

                <PetStatsBars petStats={petStats} />

                <PetContextMenu
                    visible={menuVisible}
                    pos={menuPos}
                    onFeed={feedPet}
                    onPeek={() => {
                        emitInteract("peek");
                        setMenuVisible(false);
                    }}
                    onPet={() => {
                        emitInteract("pet");
                        setMenuVisible(false);
                    }}
                />
            </div>
        </div>
    );
}
