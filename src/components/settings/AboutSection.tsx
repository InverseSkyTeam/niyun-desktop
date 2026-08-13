import { NiyunAvatar } from "@/components/ui/NiyunAvatar";

export function AboutSection() {
    return (
        <section className="space-y-6">
            <div>
                <h2 className="text-base font-semibold">关于</h2>
                <p className="mt-0.5 text-xs text-brand-500 dark:text-brand-400">
                    应用信息。
                </p>
            </div>

            <div className="flex flex-col items-center py-6 text-center">
                <div className="flex size-16 items-center justify-center">
                    <NiyunAvatar size={72} />
                </div>
                <h3 className="mt-3 text-base font-semibold">
                    逆云桌宠 学习版
                </h3>
                <p className="text-xs text-brand-500 dark:text-brand-400">
                    可以用来学习的逆云桌宠~
                </p>
                <p className="mt-1 font-mono text-[11px] text-brand-400 dark:text-brand-500">
                    v0.1.0
                </p>
            </div>

            <div className="space-y-2 border-t border-brand-200/40 pt-4 dark:border-brand-700/40">
                <div className="flex items-center justify-between text-[13px]">
                    <span className="text-brand-500 dark:text-brand-400">
                        许可
                    </span>
                    <span>MIT</span>
                </div>
            </div>
        </section>
    );
}
