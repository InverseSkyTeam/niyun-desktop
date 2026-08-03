import { tool } from "ai";
import { z } from "zod";
import { invoke } from "@tauri-apps/api/core";

export const readFileTool = tool({
    description:
        "读取项目中指定文件的内容。适用于查看源代码、配置文件、文档等文本文件。返回文件内容作为字符串。",
    inputSchema: z.object({
        path: z
            .string()
            .describe(
                "要读取的文件路径，可以是绝对路径或相对于项目根目录的路径",
            ),
    }),
    execute: async ({ path }) => {
        return await invoke<string>("read_file", { path });
    },
});

export const writeFileTool = tool({
    description:
        "将内容写入到指定的文件中。如果文件不存在则创建，如果存在则覆盖。适用于创建新文件或修改现有文件。",
    inputSchema: z.object({
        path: z
            .string()
            .describe(
                "要写入的文件路径，可以是绝对路径或相对于项目根目录的路径",
            ),
        content: z.string().describe("要写入的文件内容"),
    }),
    execute: async ({ path, content }) => {
        return await invoke<string>("write_file", { path, content });
    },
});

export const listDirectoryTool = tool({
    description:
        "列出指定目录下的所有文件和子目录。适用于浏览项目结构、查找文件等。返回文件名、是否为目录和文件大小列表。",
    inputSchema: z.object({
        path: z
            .string()
            .describe(
                "要列出的目录路径，可以是绝对路径或相对于项目根目录的路径",
            ),
    }),
    execute: async ({ path }) => {
        const entries = await invoke<
            { name: string; is_dir: boolean; size: number }[]
        >("list_directory", { path });
        return entries
            .map((e) => {
                const type = e.is_dir ? "📁" : "📄";
                const size = e.is_dir ? "" : ` (${e.size} bytes)`;
                return `${type} ${e.name}${size}`;
            })
            .join("\n");
    },
});

export const runCommandTool = tool({
    description:
        "在终端中执行 shell 命令。适用于运行构建命令、安装依赖、运行测试、git 操作等。注意：命令在项目根目录下执行。",
    inputSchema: z.object({
        command: z
            .string()
            .describe(
                "要执行的 shell 命令，例如 'npm run build'、'git status'、'ls -la' 等",
            ),
    }),
    execute: async ({ command }) => {
        return await invoke<string>("run_command", { command });
    },
});

export const getWorkspaceRootTool = tool({
    description:
        "获取当前项目的根目录路径。用于了解项目所在位置，方便其他工具操作时构造正确的路径。",
    inputSchema: z.object({}),
    execute: async () => {
        return await invoke<string>("get_workspace_root");
    },
});

export const allTools = {
    read_file: readFileTool,
    write_file: writeFileTool,
    list_directory: listDirectoryTool,
    run_command: runCommandTool,
    get_workspace_root: getWorkspaceRootTool,
} as const;

export type ToolName = keyof typeof allTools;

export const toolApprovalConfig: Record<string, "user-approval"> = {
    read_file: "user-approval",
    write_file: "user-approval",
    list_directory: "user-approval",
    run_command: "user-approval",
    get_workspace_root: "user-approval",
};

export const toolDescriptions: Record<ToolName, string> = {
    read_file: "读取文件",
    write_file: "写入文件",
    list_directory: "列出目录",
    run_command: "执行命令",
    get_workspace_root: "获取项目根目录",
};

const PROJECT_KEYWORDS = [
    "项目",
    "代码",
    "文件",
    "目录",
    "文件夹",
    "路径",
    "命令",
    "终端",
    "运行",
    "执行",
    "构建",
    "安装",
    "依赖",
    "读取",
    "写入",
    "修改",
    "创建",
    "删除",
    "复制",
    "移动",
    "重命名",
    "报错",
    "错误",
    "日志",
    "调试",
    "测试",
    "部署",
    "git",
    "npm",
    "bun",
    "pnpm",
    "yarn",
    "node",
    "bash",
    "shell",
    ".ts",
    ".js",
    ".vue",
    ".css",
    ".json",
    ".md",
    "package.json",
];

export function looksLikeProjectRequest(text: string): boolean {
    const lower = text.toLowerCase();
    return PROJECT_KEYWORDS.some((k) => lower.includes(k));
}
