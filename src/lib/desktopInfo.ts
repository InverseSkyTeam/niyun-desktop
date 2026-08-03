import { invoke } from "@tauri-apps/api/core";

export interface WindowInfo {
    title: string;
    process: string;
    class_name: string;
}

export interface DesktopInfo {
    foreground: WindowInfo | null;
    others: WindowInfo[];
    screen_w: number;
    screen_h: number;
    idle_seconds: number;
    child_texts: string[];
}

export async function getDesktopInfo(): Promise<DesktopInfo> {
    return await invoke<DesktopInfo>("get_desktop_info");
}

function cleanProcessName(p: string): string {
    if (!p) return "未知程序";
    return p.replace(/\.exe$/i, "");
}

const processCategory: Record<string, string> = {
    code: "代码编辑器",
    "code - insiders": "代码编辑器(Insiders)",
    "code.exe": "代码编辑器(VS Code)",
    "code - insiders.exe": "代码编辑器(VS Code Insiders)",
    chrome: "浏览器(Chrome)",
    "chrome.exe": "浏览器(Chrome)",
    msedge: "浏览器(Edge)",
    "msedge.exe": "浏览器(Edge)",
    firefox: "浏览器(Firefox)",
    "firefox.exe": "浏览器(Firefox)",
    wechat: "聊天工具(微信)",
    "wechat.exe": "聊天工具(微信)",
    qq: "聊天工具(QQ)",
    "qq.exe": "聊天工具(QQ)",
    "tim.exe": "聊天工具(TIM)",
    "dingtalk.exe": "办公协作(钉钉)",
    "feishu.exe": "办公协作(飞书)",
    "lark.exe": "办公协作(Lark)",
    "notepad.exe": "记事本",
    "notepad++.exe": "代码编辑器(Notepad++)",
    "idea64.exe": "IDE(IntelliJ IDEA)",
    "idea.exe": "IDE(IntelliJ IDEA)",
    "pycharm64.exe": "IDE(PyCharm)",
    "webstorm64.exe": "IDE(WebStorm)",
    "goland64.exe": "IDE(GoLand)",
    "clion64.exe": "IDE(CLion)",
    "rider64.exe": "IDE(Rider)",
    "eclipse.exe": "IDE(Eclipse)",
    "terminal.exe": "终端(Windows Terminal)",
    "windowsterminal.exe": "终端(Windows Terminal)",
    "cmd.exe": "命令提示符",
    "powershell.exe": "PowerShell",
    "pwsh.exe": "PowerShell 7",
    "wmplayer.exe": "媒体播放器(WMP)",
    "potplayer.exe": "媒体播放器(PotPlayer)",
    "vlc.exe": "媒体播放器(VLC)",
    "explorer.exe": "文件资源管理器",
    "outlook.exe": "邮件客户端(Outlook)",
    "winword.exe": "Word",
    "excel.exe": "Excel",
    "powerpnt.exe": "PowerPoint",
    "onenote.exe": "OneNote",
    "acrobat.exe": "PDF阅读器(Acrobat)",
    "acrord32.exe": "PDF阅读器(Acrobat Reader)",
    "steam.exe": "游戏平台(Steam)",
    "discord.exe": "语音聊天(Discord)",
    "obs64.exe": "录屏/直播(OBS)",
    "obs32.exe": "录屏/直播(OBS)",
    "spotify.exe": "音乐(Spotify)",
    "sublime_text.exe": "代码编辑器(Sublime Text)",
    "atom.exe": "代码编辑器(Atom)",
    "typora.exe": "Markdown编辑器(Typora)",
    "obsidian.exe": "笔记工具(Obsidian)",
    "notion.exe": "笔记工具(Notion)",
    "slack.exe": "团队协作(Slack)",
    "telegram.exe": "聊天工具(Telegram)",
    "thunderbird.exe": "邮件客户端(Thunderbird)",
    "postman.exe": "API工具(Postman)",
    "figma.exe": "设计工具(Figma)",
    "photoshop.exe": "图像处理(Photoshop)",
    "mspaint.exe": "画图",
    "calculator.exe": "计算器",
    "taskmgr.exe": "任务管理器",
    "regedit.exe": "注册表编辑器",
    "snippingtool.exe": "截图工具",
    "devenv.exe": "IDE(VS)",
    "xshell.exe": "SSH客户端(Xshell)",
    "putty.exe": "SSH客户端(PuTTY)",
    "winscp.exe": "FTP客户端(WinSCP)",
    "filezilla.exe": "FTP客户端(FileZilla)",
    "git-bash.exe": "Git Bash",
    "git-gui.exe": "Git GUI",
    "cmder.exe": "终端(Cmder)",
    "conemu.exe": "终端(ConEmu)",
    "alacritty.exe": "终端(Alacritty)",
    "hyper.exe": "终端(Hyper)",
};

function getProcessCategory(process: string): string {
    const cleaned = process.toLowerCase();
    const mapped = processCategory[cleaned];
    if (mapped) return mapped;
    if (cleaned.endsWith(".exe")) {
        const base = cleaned.replace(/\.exe$/, "");
        if (base.startsWith("code - ")) return "代码编辑器";
        if (base.startsWith("chrome")) return "浏览器(Chrome)";
        if (base.startsWith("msedge")) return "浏览器(Edge)";
        if (base.startsWith("firefox")) return "浏览器(Firefox)";
        if (base.endsWith("64") || base.endsWith("_64")) return "应用程序";
    }
    return "";
}

export function desktopInfoToPrompt(info: DesktopInfo): string {
    const lines: string[] = ["[用户当前桌面状态]"];

    if (info.foreground && (info.foreground.title || info.foreground.process)) {
        const f = info.foreground;
        const title = f.title || "(无标题)";
        const cat = getProcessCategory(f.process);
        const proc = cleanProcessName(f.process);
        const catPart = cat ? `（${cat}）` : "";
        lines.push(`前台窗口：《${title}》(${proc}${catPart})`);
    } else {
        lines.push("前台窗口：无法获取");
    }

    if (info.idle_seconds > 5) {
        const mins = Math.floor(info.idle_seconds / 60);
        if (mins > 0) {
            lines.push(`用户已空闲约 ${mins} 分钟`);
        } else {
            lines.push(`用户已空闲 ${info.idle_seconds} 秒`);
        }
    } else {
        lines.push("用户正在活跃操作");
    }

    if (info.child_texts.length) {
        const filtered = info.child_texts.filter((t) => {
            const lower = t.toLowerCase();
            return (
                !lower.includes("statusbar") &&
                !lower.includes("scrollbar") &&
                t.length > 2 &&
                !/^[\d\s\.\-_]+$/.test(t)
            );
        });
        if (filtered.length) {
            lines.push("前台窗口内的文本内容：");
            for (const t of filtered.slice(0, 8)) {
                const truncated = t.length > 80 ? t.slice(0, 80) + "…" : t;
                lines.push(`  "${truncated}"`);
            }
        }
    }

    if (info.others.length) {
        lines.push("其他可见窗口：");
        for (const w of info.others) {
            const title = w.title || "(无标题)";
            const cat = getProcessCategory(w.process);
            const proc = cleanProcessName(w.process);
            const catPart = cat ? `（${cat}）` : "";
            lines.push(`  - 《${title}》(${proc}${catPart})`);
        }
    }

    if (info.screen_w > 0 && info.screen_h > 0) {
        lines.push(`屏幕分辨率：${info.screen_w}×${info.screen_h}`);
    }

    return lines.join("\n");
}
