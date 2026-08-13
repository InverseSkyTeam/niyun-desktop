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
    code: "代码编辑器(VS Code)",
    "code - insiders": "代码编辑器(VS Code Insiders)",
    chrome: "浏览器(Chrome)",
    msedge: "浏览器(Edge)",
    firefox: "浏览器(Firefox)",
    wechat: "聊天工具(微信)",
    qq: "聊天工具(QQ)",
    tim: "聊天工具(TIM)",
    dingtalk: "办公协作(钉钉)",
    feishu: "办公协作(飞书)",
    lark: "办公协作(Lark)",
    notepad: "记事本",
    "notepad++": "代码编辑器(Notepad++)",
    idea: "IDE(IntelliJ IDEA)",
    pycharm: "IDE(PyCharm)",
    webstorm: "IDE(WebStorm)",
    goland: "IDE(GoLand)",
    clion: "IDE(CLion)",
    rider: "IDE(Rider)",
    eclipse: "IDE(Eclipse)",
    terminal: "终端(Windows Terminal)",
    windowsterminal: "终端(Windows Terminal)",
    cmd: "命令提示符",
    powershell: "PowerShell",
    pwsh: "PowerShell 7",
    wmplayer: "媒体播放器(WMP)",
    potplayer: "媒体播放器(PotPlayer)",
    vlc: "媒体播放器(VLC)",
    explorer: "文件资源管理器",
    outlook: "邮件客户端(Outlook)",
    winword: "Word",
    excel: "Excel",
    powerpnt: "PowerPoint",
    onenote: "OneNote",
    acrobat: "PDF阅读器(Acrobat)",
    acrord32: "PDF阅读器(Acrobat Reader)",
    steam: "游戏平台(Steam)",
    discord: "语音聊天(Discord)",
    obs: "录屏/直播(OBS)",
    spotify: "音乐(Spotify)",
    sublime_text: "代码编辑器(Sublime Text)",
    atom: "代码编辑器(Atom)",
    typora: "Markdown编辑器(Typora)",
    obsidian: "笔记工具(Obsidian)",
    notion: "笔记工具(Notion)",
    slack: "团队协作(Slack)",
    telegram: "聊天工具(Telegram)",
    thunderbird: "邮件客户端(Thunderbird)",
    postman: "API工具(Postman)",
    figma: "设计工具(Figma)",
    photoshop: "图像处理(Photoshop)",
    mspaint: "画图",
    calculator: "计算器",
    taskmgr: "任务管理器",
    regedit: "注册表编辑器",
    snippingtool: "截图工具",
    devenv: "IDE(VS)",
    xshell: "SSH客户端(Xshell)",
    putty: "SSH客户端(PuTTY)",
    winscp: "FTP客户端(WinSCP)",
    filezilla: "FTP客户端(FileZilla)",
    "git-bash": "Git Bash",
    "git-gui": "Git GUI",
    cmder: "终端(Cmder)",
    conemu: "终端(ConEmu)",
    alacritty: "终端(Alacritty)",
    hyper: "终端(Hyper)",
};


const knownSuffix64: Record<string, string> = {
    idea: "IDE(IntelliJ IDEA)",
    pycharm: "IDE(PyCharm)",
    webstorm: "IDE(WebStorm)",
    goland: "IDE(GoLand)",
    clion: "IDE(CLion)",
    rider: "IDE(Rider)",
    obs: "录屏/直播(OBS)",
};

function getProcessCategory(process: string): string {
    const cleaned = process.toLowerCase().replace(/\.exe$/i, "");
    const mapped = processCategory[cleaned];
    if (mapped) return mapped;
    if (cleaned.endsWith("64")) {
        const m64 = knownSuffix64[cleaned.slice(0, -2)];
        if (m64) return m64;
    }
    return matchKnownPrefix(cleaned);
}

function matchKnownPrefix(cleaned: string): string {
    if (cleaned.startsWith("code - ")) return "代码编辑器(VS Code)";
    if (cleaned.startsWith("chrome")) return "浏览器(Chrome)";
    if (cleaned.startsWith("msedge")) return "浏览器(Edge)";
    if (cleaned.startsWith("firefox")) return "浏览器(Firefox)";
    return "";
}


function describeCategory(process: string): string {
    const cat = getProcessCategory(process);
    return cat ? `（${cat}）` : "";
}

function formatForegroundLine(info: DesktopInfo): string {
    const f = info.foreground;
    if (!f || (!f.title && !f.process)) return "前台窗口：无法获取";
    const title = f.title || "(无标题)";
    return `前台窗口：《${title}》(${cleanProcessName(f.process)}${describeCategory(f.process)})`;
}

function formatIdleLine(idleSeconds: number): string {
    if (idleSeconds <= 5) return "用户正在活跃操作";
    const mins = Math.floor(idleSeconds / 60);
    return mins > 0
        ? `用户已空闲约 ${mins} 分钟`
        : `用户已空闲 ${idleSeconds} 秒`;
}

function isUsefulChildText(t: string): boolean {
    const lower = t.toLowerCase();
    return (
        !lower.includes("statusbar") &&
        !lower.includes("scrollbar") &&
        t.length > 2 &&
        !/^[\d\s\.\-_]+$/.test(t)
    );
}

function truncateText(t: string): string {
    return t.length > 80 ? t.slice(0, 80) + "…" : t;
}

function formatChildTextLines(childTexts: string[]): string[] {
    const filtered = childTexts.filter(isUsefulChildText);
    if (filtered.length === 0) return [];
    return [
        "前台窗口内的文本内容：",
        ...filtered.slice(0, 8).map((t) => `  "${truncateText(t)}"`),
    ];
}

function formatOtherWindowLines(others: WindowInfo[]): string[] {
    if (others.length === 0) return [];
    return [
        "其他可见窗口：",
        ...others.map((w) => {
            const title = w.title || "(无标题)";
            return `  - 《${title}》(${cleanProcessName(w.process)}${describeCategory(w.process)})`;
        }),
    ];
}

function formatResolution(screenW: number, screenH: number): string | null {
    if (screenW <= 0 || screenH <= 0) return null;
    return `屏幕分辨率：${screenW}×${screenH}`;
}

export function desktopInfoToPrompt(info: DesktopInfo): string {
    const lines = [
        "[用户当前桌面状态]",
        formatForegroundLine(info),
        formatIdleLine(info.idle_seconds),
        ...formatChildTextLines(info.child_texts),
        ...formatOtherWindowLines(info.others),
    ];
    const res = formatResolution(info.screen_w, info.screen_h);
    if (res) lines.push(res);
    return lines.join("\n");
}
