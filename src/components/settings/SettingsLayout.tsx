import { TitleBar } from "@/components/ui/TitleBar";
import { SettingsPage } from "./SettingsPage";

export function SettingsLayout() {
    return (
        <div className="flex min-w-0 flex-1 flex-col">
            <TitleBar title="设置" />
            <SettingsPage />
        </div>
    );
}
