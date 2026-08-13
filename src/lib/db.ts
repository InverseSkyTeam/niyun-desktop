import Database from "@tauri-apps/plugin-sql";
import type { ChatMessage, Conversation } from "./types";
import { isTauri } from "./tauri";

let db: Database | null = null;

const DB_PATH = "sqlite:niyun.db";

async function getDb(): Promise<Database> {
    if (!isTauri()) {
        throw new Error("数据库仅支持在 Tauri 环境中使用");
    }
    if (db) return db;
    db = await Database.load(DB_PATH);
    await initTables();
    return db;
}

async function initTables() {
    await db!.execute(`
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL DEFAULT '新对话',
            system_prompt TEXT NOT NULL DEFAULT '',
            created_at INTEGER NOT NULL,
            last_active INTEGER NOT NULL
        )
    `);
    await db!.execute(`
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
            content TEXT NOT NULL DEFAULT '',
            created_at INTEGER NOT NULL,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        )
    `);
}

export async function loadConversations(): Promise<Conversation[]> {
    const d = await getDb();
    const rows = await d.select<Record<string, unknown>[]>(
        "SELECT id, title, system_prompt, created_at, last_active FROM conversations ORDER BY last_active DESC",
    );
    return rows.map((r) => ({
        id: r.id as string,
        title: r.title as string,
        systemPrompt: r.system_prompt as string,
        createdAt: r.created_at as number,
        lastActive: r.last_active as number,
    }));
}

export async function createConversation(
    id: string,
    title: string,
    systemPrompt: string,
): Promise<void> {
    const d = await getDb();
    const now = Date.now();
    await d.execute(
        "INSERT INTO conversations (id, title, system_prompt, created_at, last_active) VALUES ($1, $2, $3, $4, $5)",
        [id, title, systemPrompt, now, now],
    );
}

export async function removeConversation(id: string): Promise<void> {
    const d = await getDb();
    await d.execute("DELETE FROM conversations WHERE id = $1", [id]);
}

export async function touchConversation(id: string): Promise<void> {
    const d = await getDb();
    await d.execute("UPDATE conversations SET last_active = $1 WHERE id = $2", [
        Date.now(),
        id,
    ]);
}

export async function loadMessages(
    conversationId: string,
): Promise<ChatMessage[]> {
    const d = await getDb();
    const rows = await d.select<Record<string, unknown>[]>(
        "SELECT id, role, content, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC",
        [conversationId],
    );
    return rows.map((r) => ({
        id: r.id as string,
        role: r.role as "user" | "assistant" | "system",
        content: r.content as string,
        createdAt: r.created_at as number,
    }));
}

export async function addMessage(
    conversationId: string,
    msg: ChatMessage,
): Promise<void> {
    const d = await getDb();
    await d.execute(
        "INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES ($1, $2, $3, $4, $5)",
        [msg.id, conversationId, msg.role, msg.content, msg.createdAt],
    );
}

export async function updateMessage(
    id: string,
    content: string,
): Promise<void> {
    const d = await getDb();
    await d.execute("UPDATE messages SET content = $1 WHERE id = $2", [
        content,
        id,
    ]);
}


export async function deleteMessages(
    conversationId: string,
    ids: string[],
): Promise<void> {
    const d = await getDb();
    for (const id of ids) {
        await d.execute(
            "DELETE FROM messages WHERE conversation_id = $1 AND id = $2",
            [conversationId, id],
        );
    }
}

export async function getSystemPrompt(conversationId: string): Promise<string> {
    const d = await getDb();
    const rows = await d.select<Record<string, unknown>[]>(
        "SELECT system_prompt FROM conversations WHERE id = $1",
        [conversationId],
    );
    if (rows.length > 0) return (rows[0].system_prompt as string) || "";
    return "";
}
