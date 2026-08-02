export type MdNode =
    | { type: "h1" | "h2" | "h3"; inline: Inline[] }
    | { type: "p"; inline: Inline[] }
    | { type: "code"; lang: string; content: string }
    | { type: "ul"; items: Inline[][] }
    | { type: "ol"; items: Inline[][] }
    | { type: "quote"; inline: Inline[] }
    | { type: "hr" };

export interface Inline {
    kind: "text" | "bold" | "italic" | "code" | "link";
    text: string;
    href?: string;
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function parseInline(text: string): Inline[] {
    const out: Inline[] = [];
    let i = 0;
    let buf = "";
    while (i < text.length) {
        const rest = text.slice(i);
        if (rest.startsWith("**")) {
            const end = text.indexOf("**", i + 2);
            if (end !== -1) {
                if (buf) { out.push({ kind: "text", text: buf }); buf = ""; }
                out.push({ kind: "bold", text: text.slice(i + 2, end) });
                i = end + 2;
                continue;
            }
        }
        if (rest.startsWith("*") && !rest.startsWith("**")) {
            const end = text.indexOf("*", i + 1);
            if (end !== -1 && end !== i + 1) {
                if (buf) { out.push({ kind: "text", text: buf }); buf = ""; }
                out.push({ kind: "italic", text: text.slice(i + 1, end) });
                i = end + 1;
                continue;
            }
        }
        if (rest.startsWith("`")) {
            const end = text.indexOf("`", i + 1);
            if (end !== -1) {
                if (buf) { out.push({ kind: "text", text: buf }); buf = ""; }
                out.push({ kind: "code", text: text.slice(i + 1, end) });
                i = end + 1;
                continue;
            }
        }
        if (rest.startsWith("[")) {
            const m = /^\[([^\]]+)\]\(([^)]+)\)/.exec(rest);
            if (m) {
                if (buf) { out.push({ kind: "text", text: buf }); buf = ""; }
                out.push({ kind: "link", text: m[1], href: m[2] });
                i += m[0].length;
                continue;
            }
        }
        buf += text[i];
        i++;
    }
    if (buf) out.push({ kind: "text", text: buf });
    return out;
}

export function parseMarkdown(src: string): MdNode[] {
    const nodes: MdNode[] = [];
    const lines = src.replace(/\r\n/g, "\n").split("\n");
    let i = 0;

    while (i < lines.length) {
        let line = lines[i];

        if (!line.trim()) { i++; continue; }

        const codeMatch = /^```(\w*)$/.exec(line.trim());
        if (codeMatch) {
            const lang = codeMatch[1] || "text";
            const buf: string[] = [];
            i++;
            while (i < lines.length && lines[i].trim() !== "```") {
                buf.push(lines[i]);
                i++;
            }
            i++;
            nodes.push({ type: "code", lang, content: buf.join("\n") });
            continue;
        }

        if (/^###\s+/.test(line)) {
            nodes.push({ type: "h3", inline: parseInline(line.replace(/^###\s+/, "")) });
            i++; continue;
        }
        if (/^##\s+/.test(line)) {
            nodes.push({ type: "h2", inline: parseInline(line.replace(/^##\s+/, "")) });
            i++; continue;
        }
        if (/^#\s+/.test(line)) {
            nodes.push({ type: "h1", inline: parseInline(line.replace(/^#\s+/, "")) });
            i++; continue;
        }

        if (/^>\s?/.test(line)) {
            const buf: string[] = [];
            while (i < lines.length && /^>\s?/.test(lines[i])) {
                buf.push(lines[i].replace(/^>\s?/, ""));
                i++;
            }
            nodes.push({ type: "quote", inline: parseInline(buf.join(" ")) });
            continue;
        }

        if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
            nodes.push({ type: "hr" });
            i++; continue;
        }

        if (/^[-*]\s+/.test(line)) {
            const items: Inline[][] = [];
            while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
                items.push(parseInline(lines[i].replace(/^[-*]\s+/, "")));
                i++;
            }
            nodes.push({ type: "ul", items });
            continue;
        }

        if (/^\d+\.\s+/.test(line)) {
            const items: Inline[][] = [];
            while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
                items.push(parseInline(lines[i].replace(/^\d+\.\s+/, "")));
                i++;
            }
            nodes.push({ type: "ol", items });
            continue;
        }

        const para: string[] = [];
        while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|>|```|[-*]\s|\d+\.\s|-{3,})/.test(lines[i])) {
            para.push(lines[i]);
            i++;
        }
        if (para.length) {
            nodes.push({ type: "p", inline: parseInline(para.join(" ")) });
        }
    }
    return nodes;
}

export function renderInlineToHtml(inlines: Inline[]): string {
    return inlines.map((n) => {
        const t = escapeHtml(n.text);
        switch (n.kind) {
            case "bold": return `<strong>${t}</strong>`;
            case "italic": return `<em>${t}</em>`;
            case "code": return `<code>${t}</code>`;
            case "link": return `<a href="${escapeHtml(n.href || "#")}" target="_blank" rel="noopener">${t}</a>`;
            default: return t;
        }
    }).join("");
}
