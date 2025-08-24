"use client"

import { useState, useEffect, useRef } from "react"
import { ChatInput, ChatInputTextArea, ChatInputSubmit } from "@/components/ui/chat-input"
import { ChatMessage } from "@/components/chat-message"
import { SuggestionPills } from "@/components/suggestion-pills"
import { Sparkles, Plus, X, LogIn, LogOut } from "lucide-react"
import Image from "next/image"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

interface Message {
  id: string
  text: string
  isUser: boolean
  timestamp: string
  files?: string[]
  previews?: string[]
}

interface Attachment {
  id: string
  file: File
  previewUrl: string
}

const initialSuggestions = [
  "Хочу стать разработчиком приложений",
  "Помоги спланировать поступление в мед",
  "Интересуюсь финансами и инвестициями",
  "Покажи направления карьеры в AI и ML",
]

const followUpSuggestions = [
  "На каких навыках сосредоточиться?",
  "Какие требования к поступлению?",
  "Как получить релевантный опыт?",
  "Какие зарплатные ожидания?",
]

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [hasStartedChat, setHasStartedChat] = useState(false)
  const [showCompactMode, setShowCompactMode] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [signedIn, setSignedIn] = useState<boolean>(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamCancelRef = useRef<boolean>(false)
  const { toast } = useToast()
  const modelOptions = [
    "gpt-4o-mini",
    "gpt-4o",
    "o1",
    "o1-mini",
    "o1-pro",
    "o3",
    "o3-mini",
    "o4-mini",
    "gpt-5",
    "gpt-5-mini",
    "gpt-5-nano",
    "gpt-5-chat-latest",
    "gpt-4.1",
    "gpt-4.1-mini",
    "gpt-4.1-nano",
    "gpt-4.5-preview",
    "claude-sonnet-4",
    "claude-opus-4",
    "claude-3-7-sonnet",
    "claude-3-5-sonnet",
    "deepseek-chat",
    "deepseek-reasoner",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
    "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
    "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
    "mistral-large-latest",
    "pixtral-large-latest",
    "codestral-latest",
    "google/gemma-2-27b-it",
    "grok-beta",
  ] as const
  const [selectedModel, setSelectedModel] = useState<string>("gpt-5")

  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    }
  }, [messages])

  // Check initial auth state
  useEffect(() => {
    const puter = (typeof window !== "undefined" ? (window as any).puter : undefined)
    try {
      if (puter?.auth?.isSignedIn) {
        const v = puter.auth.isSignedIn()
        setSignedIn(Boolean(v))
      }
    } catch {}
  }, [])

  // Restore persisted auth flag (UI-level) and re-check it on window focus
  useEffect(() => {
    try {
      const saved = typeof window !== "undefined" ? window.localStorage.getItem("signedIn") : null
      if (saved === "1" || saved === "true") setSignedIn(true)
    } catch {}
  }, [])

  useEffect(() => {
    try {
      if (typeof window !== "undefined") window.localStorage.setItem("signedIn", signedIn ? "1" : "0")
    } catch {}
  }, [signedIn])

  useEffect(() => {
    const onFocus = () => {
      const puter = (typeof window !== "undefined" ? (window as any).puter : undefined)
      try {
        if (puter?.auth?.isSignedIn) {
          const v = puter.auth.isSignedIn()
          setSignedIn(Boolean(v))
        }
      } catch {}
    }
    if (typeof window !== "undefined") window.addEventListener("focus", onFocus)
    return () => {
      if (typeof window !== "undefined") window.removeEventListener("focus", onFocus)
    }
  }, [])

  // Note: We revoke preview URLs when removing attachments and after send.

  const handleFilesAdd = (files: FileList | File[]) => {
    const newOnes = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, 6)
      .map((f) => ({ id: `${Date.now()}_${Math.random()}`, file: f, previewUrl: URL.createObjectURL(f) }))
    setAttachments((prev) => {
      const merged = [...prev, ...newOnes]
      return merged.slice(0, 6)
    })
  }

  const onFileInputChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesAdd(e.target.files)
      // allow picking the same file again later
      e.target.value = ""
    }
  }

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const found = prev.find((a) => a.id === id)
      try {
        if (found) URL.revokeObjectURL(found.previewUrl)
      } catch {}
      return prev.filter((a) => a.id !== id)
    })
  }

  const handleSubmit = async () => {
    // Require auth before sending any message
    if (!signedIn) {
      // Show prompt to sign in and do not send
      toast({ title: "Требуется вход", description: "Пожалуйста, войдите в аккаунт" })
      return
    }

    if (!inputValue.trim() && attachments.length === 0) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue.trim() || (attachments.length > 0 ? "" : ""),
      isUser: true,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      previews: attachments.map((a) => a.previewUrl),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)
    setIsStreaming(false)
    streamCancelRef.current = false

    if (!hasStartedChat) {
      setHasStartedChat(true)
      setTimeout(() => {
        setShowCompactMode(true)
      }, 500)
    }

    try {
      // Build conversation history (include files if present)
      const aiMessages: any[] = messages.map((m) => {
        if (m.files && m.files.length > 0) {
          const contentItems = [
            ...m.files.map((p) => ({ type: "file", puter_path: p })),
            ...(m.text?.trim() ? [{ type: "text", text: m.text.trim() }] : []),
          ]
          return { role: m.isUser ? "user" : "assistant", content: contentItems }
        }
        return { role: m.isUser ? "user" : "assistant", content: m.text }
      })

      // Добавим инструкцию по форматированию, чтобы ИИ использовал KaTeX и корректно оформлял код
      const formatInstruction = [
        "Форматируй ответы для читабельности:",
        "- Математику пиши в KaTeX: inline — $a^2 + b^2 = c^2$, блочно — $$E=mc^2$$.",
        "- Код давай в тройных бэктиках с указанием языка, например ```js ... ```.",
        "- Не обрамляй формулы в кавычки. В обычном тексте используй $...$, для крупных формул — $$...$$.",
      ].join("\n")
      // Используем роль 'user' для совместимости
      aiMessages.unshift({ role: "user", content: formatInstruction })

      // Use Puter.js to talk to cloud AI models asynchronously.
      const puter = (typeof window !== "undefined" ? (window as any).puter : undefined)
      if (!puter?.ai?.chat) {
        throw new Error("Puter.js is not loaded yet. Please try again in a moment.")
      }

      // Upload attachments (if any) to Puter FS and collect their paths
      let filePaths: string[] = []
      if (attachments.length > 0) {
        try {
          if (puter?.fs?.upload) {
            const uploadRes: any = await puter.fs.upload(attachments.map((a: Attachment) => a.file))
            if (Array.isArray(uploadRes)) filePaths = uploadRes.map((f: any) => f.path).filter(Boolean)
            else if (uploadRes?.path) filePaths = [uploadRes.path]
          } else if (puter?.fs?.write) {
            const paths: string[] = []
            for (const a of attachments) {
              const ext = a.file.name.includes(".") ? a.file.name.split(".").pop() : "bin"
              const f = await puter.fs.write(`upload_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`, a.file)
              if (f?.path) paths.push(f.path)
            }
            filePaths = paths
          }
        } catch (e) {
          // If upload fails, continue without files
        }
      }

      // Compose the current user message (text + files) for AI and persist file paths to history
      if (filePaths.length > 0) {
        const contentItems = [
          ...filePaths.map((p) => ({ type: "file", puter_path: p })),
          ...(inputValue.trim() ? [{ type: "text", text: inputValue.trim() }] : []),
        ]
        aiMessages.push({ role: "user", content: contentItems })
        // persist on the last added user message in UI history
        setMessages((prev) => prev.map((m) => (m.id === userMessage.id ? { ...m, files: filePaths } : m)))
      } else {
        aiMessages.push({ role: "user", content: inputValue })
      }

      // В testMode работаем, если пользователь не вошёл; при входе используем реальные модели
      const useStreaming = true
      if (useStreaming) {
        const stream: any = await puter.ai.chat(aiMessages, !signedIn, { model: selectedModel, stream: true })
        const aiId = (Date.now() + 1).toString()
        const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        setMessages((prev) => [...prev, { id: aiId, text: "", isUser: false, timestamp: ts }])
        setIsStreaming(true)
        for await (const part of stream as any) {
          if (streamCancelRef.current) break
          let chunk = ""
          if (typeof part === "string") chunk = part
          else if (part?.text) chunk = String(part.text)
          else if (Array.isArray(part?.message?.content)) {
            chunk = part.message.content
              .map((c: any) => (c?.text ? String(c.text) : ""))
              .filter(Boolean)
              .join("")
          }
          if (chunk) {
            setMessages((prev) => prev.map((m) => (m.id === aiId ? { ...m, text: (m.text || "") + chunk } : m)))
          }
        }
        try {
          if (typeof stream?.return === "function") await stream.return()
        } catch {}
        setIsStreaming(false)
      } else {
        const response = await puter.ai.chat(aiMessages, !signedIn, { model: selectedModel })

        // Normalize response into a displayable string. puter.ai.chat may return a string
        // or an object containing a `message` with `content`.
        let aiText: string = ""
        if (typeof response === "string") {
          aiText = response
        } else if (response?.message?.content) {
          const content = response.message.content
          if (typeof content === "string") {
            aiText = content
          } else if (Array.isArray(content)) {
            // Concatenate any text parts if content is an array (multимodal support)
            aiText = content
              .map((c: any) => (c?.text ? String(c.text) : ""))
              .filter(Boolean)
              .join(" ")
          }
        } else if (response?.text) {
          aiText = String(response.text)
        } else {
          aiText = JSON.stringify(response)
        }

        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: aiText,
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }
        setMessages((prev) => [...prev, aiResponse])
      }
      // Clear attachments after successful send (keep previews alive for chat history)
      if (attachments.length > 0) {
        setAttachments([])
      }
    } catch (err: any) {
      let details = "Unknown error"
      if (err?.message && typeof err.message === "string") {
        details = err.message
      } else if (err?.response?.message) {
        details = String(err.response.message)
      } else if (err?.error?.message) {
        details = String(err.error.message)
      } else if (typeof err === "object") {
        try {
          details = JSON.stringify(err, null, 2)
        } catch {
          details = String(err)
        }
      } else {
        details = String(err)
      }

      // Map specific usage-limited error to a friendly message
      const isUsageLimited = /delegate `usage-limited-chat`.*Permission denied/i.test(details)
      const displayText = isUsageLimited ? "лимит исчерпан возвращайтесь завтра" : `AI error: ${details}`

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: displayText,
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
      setMessages((prev) => [...prev, aiResponse])
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
      streamCancelRef.current = false
    }
  }

  // Note: If you previously used window.prompt() to collect input, replace it with:
  // const input = await puter.ui.prompt("Введите сообщение:", "Привет")
  // puter.ui.prompt() shows a non-blocking input dialog and returns a Promise.

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion)
  }

  const newChat = () => {
    // Cancel any ongoing stream
    streamCancelRef.current = true
    setIsStreaming(false)
    setIsLoading(false)
    // Revoke preview URLs to avoid memory leaks
    try {
      attachments.forEach((a) => {
        try {
          URL.revokeObjectURL(a.previewUrl)
        } catch {}
      })
    } catch {}
    setAttachments([])
    setMessages([])
    setInputValue("")
    setHasStartedChat(false)
    setShowCompactMode(false)
  }

  const userMessageCount = messages.filter((m) => m.isUser).length
  const showSuggestionsPills = userMessageCount < 2
  const currentSuggestions = messages.length > 0 ? followUpSuggestions : initialSuggestions

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-end sm:justify-between px-3 sm:px-6 py-3 sm:py-4">
          <div className="hidden sm:flex items-center gap-2">
            <Image src="/placeholder-logo.svg" alt="logo" width={24} height={24} className="w-6 h-6" />
            <span className="hidden sm:inline text-lg font-semibold">puter</span>
          </div>
          {/* Выбор модели и вход */}
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <span className="hidden sm:inline text-sm text-muted-foreground">Модель</span>
            <Select value={selectedModel} onValueChange={(v) => setSelectedModel(v)}>
              <SelectTrigger size="sm" className="text-xs sm:text-sm w-[40vw] min-w-[120px] sm:w-auto sm:min-w-[220px]">
                <SelectValue placeholder="Выберите модель" />
              </SelectTrigger>
              <SelectContent>
                {modelOptions.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* New Chat (+) */}
            <Button
              variant="outline"
              size="icon"
              onClick={newChat}
              aria-label="Новый чат"
              title="Новый чат"
              className="shrink-0"
            >
              <Plus className="w-4 h-4" />
            </Button>
            {/* Auth button: icon on mobile, text on larger screens */}
            <Button
              variant="outline"
              size="icon"
              onClick={async () => {
                const puter = (typeof window !== "undefined" ? (window as any).puter : undefined)
                if (!puter?.auth) return
                try {
                  if (signedIn && puter.auth.signOut) {
                    await puter.auth.signOut()
                    setSignedIn(false)
                  } else if (!signedIn && puter.auth.signIn) {
                    await puter.auth.signIn()
                    const v = puter.auth.isSignedIn ? puter.auth.isSignedIn() : true
                    setSignedIn(Boolean(v))
                  }
                } catch {}
              }}
              className="sm:hidden shrink-0"
              aria-label={signedIn ? "Выйти" : "Войти"}
              title={signedIn ? "Выйти" : "Войти"}
            >
              {signedIn ? <LogOut className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const puter = (typeof window !== "undefined" ? (window as any).puter : undefined)
                if (!puter?.auth) return
                try {
                  if (signedIn && puter.auth.signOut) {
                    await puter.auth.signOut()
                    setSignedIn(false)
                  } else if (!signedIn && puter.auth.signIn) {
                    await puter.auth.signIn()
                    const v = puter.auth.isSignedIn ? puter.auth.isSignedIn() : true
                    setSignedIn(Boolean(v))
                  }
                } catch {}
              }}
              className="hidden sm:inline-flex shrink-0"
            >
              {signedIn ? "Выйти" : "Войти"}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20">
        {!hasStartedChat ? (
          /* Initial Full Screen Chat */
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-5rem)] px-6">
            <div className="w-full max-w-2xl">
              <div className="text-center mb-12">
                <h1 className="text-4xl font-bold mb-4">Готов, когда ты готов</h1>
              </div>

              <div className="space-y-6">
                {showSuggestionsPills && (
                  <SuggestionPills suggestions={currentSuggestions} onSuggestionClick={handleSuggestionClick} />
                )}

                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((a) => (
                      <div key={a.id} className="relative w-24 h-24 rounded-xl overflow-hidden border">
                        <img src={a.previewUrl} alt="attachment" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-1"
                          onClick={() => removeAttachment(a.id)}
                          aria-label="Удалить"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-start gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Добавить фото"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>

                  <ChatInput
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onSubmit={handleSubmit}
                    loading={isLoading}
                    onStop={() => {
                      streamCancelRef.current = true
                      setIsStreaming(false)
                    }}
                    className="flex-1"
                    allowEmpty={attachments.length > 0}
                  >
                    <ChatInputTextArea placeholder="Расскажите о своих целях и планах..." className="text-base" />
                    <ChatInputSubmit />
                  </ChatInput>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Compact Mode Layout */
          <div className="flex">
            {/* Main Content Area */}
            <div className="flex-1 max-w-4xl mx-auto">
              {/* Chat Messages */}
              <div className="px-6 py-8 pb-40">
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message.text}
                    isUser={message.isUser}
                    timestamp={message.timestamp}
                    files={message.files}
                    previews={message.previews}
                  />
                ))}
                {isLoading && !isStreaming && (
                  <div className="flex gap-3 mb-6">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>
        )}

        {/* Bottom Chat Input (Compact Mode) */}
        {showCompactMode && (
          <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-2xl px-6 fade-in`}>
            <div className="space-y-6 mt-8">
              {showSuggestionsPills && (
                <SuggestionPills suggestions={currentSuggestions} onSuggestionClick={handleSuggestionClick} />
              )}

              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {attachments.map((a) => (
                    <div key={a.id} className="relative w-20 h-20 rounded-xl overflow-hidden border">
                      <img src={a.previewUrl} alt="attachment" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-1"
                        onClick={() => removeAttachment(a.id)}
                        aria-label="Удалить"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-start gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Добавить фото"
                  className="bg-card shadow-lg border-border"
                >
                  <Plus className="w-4 h-4" />
                </Button>

                <ChatInput
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onSubmit={handleSubmit}
                  loading={isLoading}
                  onStop={() => {
                    streamCancelRef.current = true
                    setIsStreaming(false)
                  }}
                  className="bg-card shadow-lg border-border flex-1"
                  allowEmpty={attachments.length > 0}
                >
                  <ChatInputTextArea placeholder="Напишите сообщение..." className="bg-transparent" />
                  <ChatInputSubmit />
                </ChatInput>
              </div>
            </div>
          </div>
        )}
      </main>
      {/* shared hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onFileInputChange}
      />
    </div>
  )
}
