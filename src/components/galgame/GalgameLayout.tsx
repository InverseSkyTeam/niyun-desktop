import { Sidebar } from "@/components/ui/Sidebar";
import { TitleBar } from "@/components/ui/TitleBar";
import { GalgameView } from "./GalgameView";

export function GalgameLayout() {
    return (
        <>
            <Sidebar />
            <div className="flex min-w-0 flex-1 flex-col">
                <TitleBar title="视觉小说" />
                <GalgameView />
            </div>
        </>
    );
}
