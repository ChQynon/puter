"use client"

import { cn } from "@/lib/utils"
import { Sparkles } from "lucide-react"
import { useEffect, useRef } from "react"

interface ChatMessageProps {
  message: string
  isUser: boolean
  timestamp?: string
  className?: string
  files?: string[]
  previews?: string[]
}

// Very small helper: split triple-backtick code blocks from plain text
function splitCodeBlocks(input: string): Array<
  | { type: "code"; lang?: string | null; content: string }
  | { type: "text"; content: string }
> {
  const parts: Array<any> = []
  const regex = /```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: input.slice(lastIndex, match.index) })
    }
    parts.push({ type: "code", lang: match[1] || "", content: match[2] || "" })
    lastIndex = regex.lastIndex
  }
  if (lastIndex < input.length) {
    parts.push({ type: "text", content: input.slice(lastIndex) })
  }
  return parts
}

export function ChatMessage({ message, isUser, timestamp, className, files, previews }: ChatMessageProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  // Auto-render KaTeX for $...$ and $$...$$ when message updates
  useEffect(() => {
    let canceled = false

    async function ensureKatex() {
      try {
        if (!contentRef.current) return
        let render: any = (window as any)?.renderMathInElement
        if (!render) {
          const mod: any = await import("katex/contrib/auto-render")
          render = mod?.default || mod
        }
        if (canceled || !render || !contentRef.current) return
        render(contentRef.current, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false },
            { left: "\\(", right: "\\)", display: false },
            { left: "\\[", right: "\\]", display: true },
          ],
          throwOnError: false,
          ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"],
        })
      } catch {}
    }

    async function ensureHighlight() {
      try {
        if (!contentRef.current) return
        let hljs: any = (window as any)?.hljs
        if (!hljs?.highlightElement) {
          const core: any = await import("highlight.js/lib/core")
          hljs = core?.default || core
          ;(window as any).hljs = hljs
          // register common languages (best-effort)
          try { const js = await import("highlight.js/lib/languages/javascript"); hljs.registerLanguage("javascript", js.default || js) } catch {}
          try { const ts = await import("highlight.js/lib/languages/typescript"); hljs.registerLanguage("typescript", ts.default || ts) } catch {}
          try { const py = await import("highlight.js/lib/languages/python"); hljs.registerLanguage("python", py.default || py) } catch {}
          try { const json = await import("highlight.js/lib/languages/json"); hljs.registerLanguage("json", json.default || json) } catch {}
          try { const bash = await import("highlight.js/lib/languages/bash"); hljs.registerLanguage("bash", bash.default || bash) } catch {}
          try { const xml = await import("highlight.js/lib/languages/xml"); hljs.registerLanguage("xml", xml.default || xml) } catch {}
          try { const css = await import("highlight.js/lib/languages/css"); hljs.registerLanguage("css", css.default || css) } catch {}
        }
        const codes = contentRef.current.querySelectorAll('pre code')
        codes.forEach((el) => hljs.highlightElement(el as HTMLElement))
      } catch {}
    }

    ensureKatex()
    ensureHighlight()
    return () => {
      canceled = true
    }
  }, [message])

  const renderSegments = (text: string) => {
    const segments = splitCodeBlocks(text || "")
    return segments.map((seg, i) => {
      if (seg.type === "code") {
        const lang = seg.lang || "plaintext"
        return (
          <pre key={`code-${i}`} className="mt-2 mb-2 rounded-xl bg-muted/10 border border-border p-3 overflow-x-auto text-sm w-full max-w-full">
            <code className={`language-${lang} font-mono`}>{seg.content}</code>
          </pre>
        )
      }
      return (
        <div key={`txt-${i}`} className="whitespace-pre-wrap leading-relaxed">
          {seg.content}
        </div>
      )
    })
  }

  return (
    <div className={cn("chat-message flex gap-3 mb-6", className)}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
          <Sparkles className="w-4 h-4" />
        </div>
      )}

      <div className={cn("flex-1 min-w-0", isUser && "flex justify-end")}> 
        {isUser ? (
          <div className="chat-bubble-user bg-secondary text-secondary-foreground px-3 py-2 rounded-2xl max-w-[92vw] sm:max-w-xl">
            {(previews?.length || files?.length) && (
              <div className="space-y-2">
                {(previews?.length ? previews : files)?.map((src, idx) => (
                  <img key={idx} src={src} alt="attachment" className="w-full rounded-xl object-cover" />
                ))}
              </div>
            )}
            {String(message || "").trim().length > 0 && (
              <div className="mt-2" ref={contentRef}>
                {renderSegments(message)}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1" ref={contentRef}>
            <div className="text-foreground">{renderSegments(message)}</div>
            {timestamp && <div className="text-xs text-muted-foreground">{timestamp}</div>}
          </div>
        )}
      </div>
    </div>
  )
}
