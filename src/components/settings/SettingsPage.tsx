import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Info, PawPrint, Sparkles, Sun } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { NiyunAvatar } from "@/components/ui/NiyunAvatar";
import { css } from "@/lib/css";
import { AppearanceSection } from "./AppearanceSection";
import { PetSection } from "./PetSection";
import { AISection } from "./AISection";
import { AboutSection } from "./AboutSection";

type SectionId = "appearance" | "pet" | "ai" | "about";

const sections: { id: SectionId; label: string; icon: typeof Sun }[] = [
    { id: "appearance", label: "外观", icon: Sun },
    { id: "pet", label: "桌宠", icon: PawPrint },
    { id: "ai", label: "AI", icon: Sparkles },
    { id: "about", label: "关于", icon: Info },
];

export function SettingsPage() {
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState<SectionId>("appearance");

    return (
        <div className="flex flex-1 overflow-hidden">
            <nav className="flex w-60 shrink-0 flex-col border-r border-brand-200/50 bg-white/60 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]">
                <div
                    data-tauri-drag-region
                    className="flex cursor-default items-center gap-2.5 px-4 py-4"
                >
                    <div className="pointer-events-none">
                        <NiyunAvatar size={32} />
                    </div>
                    <div className="pointer-events-none min-w-0">
                        <p className="truncate text-sm leading-tight font-semibold">
                            逆云学习版
                        </p>
                    </div>
                </div>

                <div className="px-3.5">
                    <p className="px-2 pb-1.5 text-[10px] font-semibold tracking-wider text-brand-400 uppercase dark:text-brand-400/60">
                        设置
                    </p>
                </div>

                <div className="flex-1 scrollbar-thin overflow-y-auto px-2.5">
                    <ul className="space-y-0.5">
                        {sections.map((s) => {
                            const Icon = s.icon;
                            return (
                                <li key={s.id}>
                                    <div
                                        className={css(
                                            "flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 transition",
                                            activeSection === s.id
                                                ? "bg-gradient-to-r from-brand-500/15 to-brand-700/10 text-brand-700 shadow-soft dark:from-brand-500/20 dark:to-brand-700/10 dark:text-brand-100"
                                                : "text-brand-700 hover:bg-white/60 dark:text-brand-300 dark:hover:bg-white/5",
                                        )}
                                        onClick={() => setActiveSection(s.id)}
                                    >
                                        <Icon className="size-4 shrink-0" />
                                        <span className="truncate text-[13px] leading-tight font-medium">
                                            {s.label}
                                        </span>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                <div className="border-t border-brand-200/50 p-2.5 dark:border-white/10">
                    <Button
                        variant="ghost"
                        block
                        align="start"
                        onClick={() => navigate("/")}
                    >
                        <ArrowLeft className="size-4" />
                        返回对话
                    </Button>
                </div>
            </nav>

            <div className="flex-1 scrollbar-thin overflow-y-auto bg-transparent">
                <div className="mx-auto max-w-lg px-10 py-8">
                    {activeSection === "appearance" && <AppearanceSection />}
                    {activeSection === "pet" && <PetSection />}
                    {activeSection === "ai" && <AISection />}
                    {activeSection === "about" && <AboutSection />}
                </div>
            </div>
        </div>
    );
}
