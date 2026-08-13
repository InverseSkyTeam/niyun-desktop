import { useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize from "rehype-sanitize";
import { Check, Copy } from "lucide-react";
import { css } from "@/lib/css";
import "highlight.js/styles/github-dark.css";


const sanitizeSchema = {
    tagNames: [
        "a", "abbr", "b", "blockquote", "br", "code", "dd", "del", "dl",
        "dt", "em", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "i", "img",
        "kbd", "li", "ol", "p", "pre", "q", "s", "strong", "sub", "sup",
        "table", "tbody", "td", "th", "thead", "tr", "ul", "span", "div",
    ],
    attributes: {
        "*": ["className"],
        a: ["href", "title"],
        img: ["src", "alt", "title"],
    },
    protocols: {
        href: ["http", "https", "mailto"],
        src: ["http", "https"],
    },
};


function getCodeInfo(node: unknown): { lang: string; text: string } {
    const el = (node as { children?: unknown[] } | undefined)?.children?.[0] as
        | { properties?: { className?: unknown }; children?: unknown[] }
        | undefined;
    const className = Array.isArray(el?.properties?.className)
        ? el.properties.className.join(" ")
        : "";
    const lang = /language-([\w-]+)/.exec(className)?.[1] ?? "text";
    const text = (el?.children ?? [])
        .map((c) => {
            const v = (c as { value?: string }).value;
            return typeof v === "string" ? v : "";
        })
        .join("");
    return { lang, text };
}

function MarkdownPre({
    node,
    children,
}: {
    node?: unknown;
    children?: React.ReactNode;
}) {
    const { lang, text } = getCodeInfo(node);
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            
        }
    };

    return (
        <div className="not-prose my-2 overflow-hidden rounded-xl">
            <div className="flex items-center justify-between border-b border-white/10 bg-ink/80 px-3 py-1.5">
                <span className="font-mono text-[10px] tracking-wider text-brand-300 uppercase">
                    {lang}
                </span>
                <button
                    type="button"
                    className="flex items-center gap-1 text-[10px] text-brand-400 transition hover:text-white"
                    onClick={copy}
                >
                    {copied ? (
                        <Check className="size-3" />
                    ) : (
                        <Copy className="size-3" />
                    )}
                    {copied ? "已复制" : "复制"}
                </button>
            </div>
            <pre className="scrollbar-thin overflow-x-auto bg-ink/80 p-3 text-[12px] leading-relaxed text-brand-100">
                {children}
            </pre>
        </div>
    );
}

const markdownComponents: Components = {
    pre: (props) => <MarkdownPre {...(props as object)} />,
    code: ({ className, children, ...rest }) => {
        const isBlock = /language-/.test(className ?? "");
        if (isBlock) {
            return (
                <code
                    className={css("text-[0.88em]", className)}
                    {...rest}
                >
                    {children}
                </code>
            );
        }
        return (
            <code className="rounded bg-black/10 px-1 py-0.5 text-[0.88em] dark:bg-white/15">
                {children}
            </code>
        );
    },
    a: ({ href, children }) => (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-700 underline underline-offset-2 hover:opacity-80 dark:text-brand-300"
        >
            {children}
        </a>
    ),
    blockquote: ({ children }) => (
        <blockquote className="border-l-3 border-brand-400 pl-2.5 italic opacity-85">
            {children}
        </blockquote>
    ),
    ul: ({ children }) => (
        <ul className="ml-4 list-disc space-y-0.5">{children}</ul>
    ),
    ol: ({ children }) => (
        <ol className="ml-4 list-decimal space-y-0.5">{children}</ol>
    ),
};

interface MarkdownProps {
    content: string;
}

export function Markdown({ content }: MarkdownProps) {
    return (
        <div className="msg-content md-content">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight, [rehypeSanitize, sanitizeSchema]]}
                components={markdownComponents}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
