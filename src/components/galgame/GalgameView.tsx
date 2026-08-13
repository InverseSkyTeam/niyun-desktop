import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    scenarios,
    type Scenario,
    type ScenarioNode,
    type ScenarioChoice,
} from "@/lib/scenarios";
import { usePetStore } from "@/stores/petStore";
import { useTypewriter } from "./useTypewriter";
import "./galgame.css";

type Screen = "menu" | "play";

const END_SCENE_DELAY_MS = 1500;

function ScenarioMenu({
    onBack,
    onStart,
}: {
    onBack: () => void;
    onStart: (scenario: Scenario) => void;
}) {
    return (
        <div className="galgame-root">
            <button className="back-btn" onClick={onBack}>
                <span className="back-arrow">←</span>
                <span>返回聊天</span>
            </button>
            <div className="menu-screen">
                <div className="menu-header">
                    <div className="menu-emoji">📖</div>
                    <h1 className="menu-title">剧情模式</h1>
                    <p className="menu-subtitle">选一个故事，和逆云一起经历吧</p>
                </div>
                <div className="scenario-list">
                    {scenarios.map((s) => (
                        <button
                            key={s.id}
                            type="button"
                            className="scenario-card"
                            onClick={() => onStart(s)}
                        >
                            <span className="scenario-icon">{s.icon}</span>
                            <div className="scenario-info">
                                <div className="scenario-title">{s.title}</div>
                                <div className="scenario-desc">{s.desc}</div>
                            </div>
                            <span className="scenario-arrow">›</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

function ChoiceList({
    choices,
    onSelect,
}: {
    choices: ScenarioChoice[];
    onSelect: (choice: ScenarioChoice) => void;
}) {
    return (
        <div className="choices" onClick={(e) => e.stopPropagation()}>
            {choices.map((c, i) => (
                <button
                    key={i}
                    type="button"
                    className="choice-btn"
                    onClick={() => onSelect(c)}
                >
                    {c.text}
                </button>
            ))}
        </div>
    );
}

function StoryDialog({
    typingText,
    isTyping,
    showChoices,
    ended,
    currentNode,
    onSelectChoice,
}: {
    typingText: string;
    isTyping: boolean;
    showChoices: boolean;
    ended: boolean;
    currentNode: ScenarioNode | null;
    onSelectChoice: (choice: ScenarioChoice) => void;
}) {
    if (ended) return <div className="end-text">—— 完 ——</div>;

    const hasChoices = !!currentNode?.choices && currentNode.choices.length > 0;
    const showHint = !isTyping && !hasChoices;

    return (
        <div className="dialog-box">
            <p className="dialog-text">
                <span>{typingText}</span>
                {isTyping && <span className="cursor">▌</span>}
            </p>
            {showChoices && hasChoices && (
                <ChoiceList
                    choices={currentNode.choices ?? []}
                    onSelect={onSelectChoice}
                />
            )}
            {showHint && <p className="advance-hint">点击继续 ▼</p>}
        </div>
    );
}

function StoryPlayer({
    typingText,
    isTyping,
    showChoices,
    ended,
    currentNode,
    onSkipAdvance,
    onBackToMenu,
    onSelectChoice,
}: {
    typingText: string;
    isTyping: boolean;
    showChoices: boolean;
    ended: boolean;
    currentNode: ScenarioNode | null;
    onSkipAdvance: () => void;
    onBackToMenu: () => void;
    onSelectChoice: (choice: ScenarioChoice) => void;
}) {
    return (
        <div className="galgame-root">
            <div className="play-screen" onClick={onSkipAdvance}>
                <button
                    type="button"
                    className="back-btn play-back"
                    onClick={(e) => {
                        e.stopPropagation();
                        onBackToMenu();
                    }}
                >
                    <span className="back-arrow">←</span>
                    <span>返回菜单</span>
                </button>

                <div className="pet-stage">
                    <img
                        src="/niyun.png"
                        alt="逆云"
                        className={`pet-sprite mood-${currentNode?.mood ?? "neutral"}`}
                    />
                </div>

                <StoryDialog
                    typingText={typingText}
                    isTyping={isTyping}
                    showChoices={showChoices}
                    ended={ended}
                    currentNode={currentNode}
                    onSelectChoice={onSelectChoice}
                />
            </div>
        </div>
    );
}


function useGalgame() {
    const handleGalgameEffect = usePetStore((s) => s.handleGalgameEffect);
    const {
        text: typingText,
        isTyping,
        start: typeText,
        complete: completeTyping,
        stop: stopTyping,
    } = useTypewriter();

    const [screen, setScreen] = useState<Screen>("menu");
    const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
    const [currentNode, setCurrentNode] = useState<ScenarioNode | null>(null);
    const [showChoices, setShowChoices] = useState(false);
    const [ended, setEnded] = useState(false);

    const endTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

    function goToNode(scenario: Scenario, id: string) {
        const node = scenario.nodes.find((n) => n.id === id);
        if (!node) return;
        setCurrentNode(node);
        setShowChoices(false);
        typeText(node.text);
    }

    function clearEndTimer() {
        if (endTimer.current) {
            clearTimeout(endTimer.current);
            endTimer.current = undefined;
        }
    }

    function resetToMenu() {
        stopTyping();
        clearEndTimer();
        setEnded(false);
        setScreen("menu");
        setCurrentScenario(null);
        setCurrentNode(null);
        setShowChoices(false);
    }

    function skipOrAdvance() {
        if (ended) return;
        if (isTyping) {
            completeTyping();
            setShowChoices(true);
            return;
        }
        const node = currentNode;
        if (!node) return;
        if (node.choices && node.choices.length > 0) return;
        if (node.end) {
            endScenario();
            return;
        }
        if (node.nextId && currentScenario) {
            goToNode(currentScenario, node.nextId);
        }
    }

    function applyChoiceEffect(choice: ScenarioChoice) {
        const moodDelta = choice.moodEffect ?? 0;
        const hungerDelta = choice.hungerEffect ?? 0;
        if (moodDelta !== 0 || hungerDelta !== 0) {
            handleGalgameEffect({ moodDelta, hungerDelta });
        }
    }

    function selectChoice(choice: ScenarioChoice) {
        applyChoiceEffect(choice);
        if (currentScenario) {
            goToNode(currentScenario, choice.nextId);
        }
    }

    function startScenario(scenario: Scenario) {
        setCurrentScenario(scenario);
        setCurrentNode(null);
        setEnded(false);
        setScreen("play");
        goToNode(scenario, scenario.startNode);
    }

    function endScenario() {
        setEnded(true);
        stopTyping();
        clearEndTimer();
        endTimer.current = setTimeout(resetToMenu, END_SCENE_DELAY_MS);
    }

    return {
        screen,
        currentNode,
        showChoices,
        ended,
        typingText,
        isTyping,
        startScenario,
        skipOrAdvance,
        selectChoice,
        resetToMenu,
    };
}

export function GalgameView() {
    const navigate = useNavigate();
    const g = useGalgame();

    if (g.screen === "menu") {
        return <ScenarioMenu onBack={() => navigate("/")} onStart={g.startScenario} />;
    }

    return (
        <StoryPlayer
            typingText={g.typingText}
            isTyping={g.isTyping}
            showChoices={g.showChoices}
            ended={g.ended}
            currentNode={g.currentNode}
            onSkipAdvance={g.skipOrAdvance}
            onBackToMenu={g.resetToMenu}
            onSelectChoice={g.selectChoice}
        />
    );
}
