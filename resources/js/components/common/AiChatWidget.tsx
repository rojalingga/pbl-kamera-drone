import React, { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import { cn } from "@/utils";
import { AiCsIcon } from "@/icons";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: Date;
  isError?: boolean;
}

interface GeminiPart {
  text: string;
}

interface GeminiHistoryItem {
  role: "user" | "model";
  parts: GeminiPart[];
}

export interface AiChatWidgetProps {
  mode?: "admin" | "public";
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WELCOME_MESSAGE_ADMIN: ChatMessage = {
  id: "welcome-admin",
  role: "model",
  text: "Halo! Saya **KameraBot Admin** 🤖 — asisten cerdas CMS Rental Kamera & Drone.\n\nSaya siap membantu Anda memantau seluruh sistem:\n• **Transaksi**: Sewa aktif, jatuh tempo, pengembalian & denda\n• **Laporan**: Ringkasan sewa, keuangan operasional & piutang\n• **Inventori**: Mutasi stok, pengadaan baru & servis barang\n• **Katalog**: Stok riil & harga sewa alat\n\nApa yang ingin Anda tanyakan seputar sistem hari ini?",
  timestamp: new Date(),
};

const WELCOME_MESSAGE_PUBLIC: ChatMessage = {
  id: "welcome-public",
  role: "model",
  text: "Halo! Saya **KameraBot** 📸 — asisten virtual Rental Kamera & Drone.\n\nSaya dapat membantu Anda dengan:\n• Cek ketersediaan stok & harga sewa peralatan\n• Rekomendasi kamera & drone sesuai kebutuhan acara\n• Tips fotografi & videografi\n• Syarat & informasi penyewaan\n\nAda yang bisa saya bantu?",
  timestamp: new Date(),
};

const SUGGESTIONS_ADMIN = [
  "Cek sewa jatuh tempo",
  "Ringkasan keuangan bulan ini",
  "Cek piutang belum lunas",
  "Cek mutasi stok terbaru",
];

const SUGGESTIONS_PUBLIC = [
  "Cek stok kamera Sony",
  "Rekomendasi drone pemula",
  "Berapa harga sewa termurah?",
  "Syarat dan cara sewa kamera",
];

const MAX_HISTORY_PAIRS = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2, 9);
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function getStorageKeys(mode: "admin" | "public") {
  return {
    messages: `kamera_ai_${mode}_chat_messages`,
    isOpen: `kamera_ai_${mode}_chat_is_open`,
    scrollTop: `kamera_ai_${mode}_chat_scroll_top`,
  };
}

function loadStoredMessages(mode: "admin" | "public"): ChatMessage[] {
  const defaultMsg = mode === "admin" ? WELCOME_MESSAGE_ADMIN : WELCOME_MESSAGE_PUBLIC;
  if (typeof window === "undefined") return [defaultMsg];
  try {
    const raw = sessionStorage.getItem(getStorageKeys(mode).messages);
    if (!raw) return [defaultMsg];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item: any) => ({
        ...item,
        timestamp: item.timestamp ? new Date(item.timestamp) : new Date(),
      }));
    }
  } catch (e) {
    console.error("Gagal memuat riwayat chat dari storage:", e);
  }
  return [defaultMsg];
}

function loadStoredIsOpen(mode: "admin" | "public"): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(getStorageKeys(mode).isOpen) === "true";
  } catch {
    return false;
  }
}

function loadStoredScrollTop(mode: "admin" | "public"): number | null {
  if (typeof window === "undefined") return null;
  try {
    const val = sessionStorage.getItem(getStorageKeys(mode).scrollTop);
    return val !== null ? Number(val) : null;
  } catch {
    return null;
  }
}

/**
 * Render markdown sederhana: bold (**text**), bullet list (• atau -).
 */
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];

  lines.forEach((line, lineIdx) => {
    if (!line.trim()) {
      nodes.push(<br key={`br-${lineIdx}`} />);
      return;
    }

    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const inline = parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });

    if (line.trimStart().startsWith("•") || line.trimStart().startsWith("-")) {
      nodes.push(
        <div key={lineIdx} className="flex gap-1.5 items-start">
          <span className="text-brand-500 mt-0.5 flex-shrink-0">•</span>
          <span>{inline}</span>
        </div>
      );
    } else {
      nodes.push(<div key={lineIdx}>{inline}</div>);
    }
  });

  return nodes;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const TypingIndicator: React.FC = () => (
  <div className="flex items-end gap-2 max-w-[85%]">
    <div className="flex-shrink-0 size-7 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-sm">
      <AiCsIcon className="size-4 text-white" />
    </div>
    <div className="rounded-2xl rounded-bl-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3 shadow-sm">
      <div className="flex gap-1 items-center h-4">
        <span className="size-2 bg-brand-400 rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="size-2 bg-brand-400 rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="size-2 bg-brand-400 rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  </div>
);

interface MessageBubbleProps {
  message: ChatMessage;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex items-end gap-2", isUser ? "flex-row-reverse" : "flex-row", "max-w-full")}>
      {!isUser && (
        <div className="flex-shrink-0 size-7 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-sm self-end">
          <AiCsIcon className="size-4 text-white" />
        </div>
      )}

      <div className={cn("max-w-[80%] flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
            isUser
              ? "bg-gradient-to-br from-brand-500 to-brand-600 text-white rounded-br-sm"
              : message.isError
              ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-bl-sm"
              : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-sm"
          )}
        >
          {isUser ? (
            <span>{message.text}</span>
          ) : (
            <div className="space-y-0.5">{renderMarkdown(message.text)}</div>
          )}
        </div>
        <span className="text-[10px] text-gray-400 dark:text-gray-500 px-1">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
};

// ─── Main Widget ──────────────────────────────────────────────────────────────

export default function AiChatWidget({ mode }: AiChatWidgetProps) {
  // Otomatis tentukan mode: jika diberikan prop gunakan prop, jika tidak cek apakah di path /admin
  const currentMode: "admin" | "public" =
    mode ||
    (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")
      ? "admin"
      : "public");

  const storageKeys = getStorageKeys(currentMode);
  const welcomeMessage = currentMode === "admin" ? WELCOME_MESSAGE_ADMIN : WELCOME_MESSAGE_PUBLIC;
  const suggestions = currentMode === "admin" ? SUGGESTIONS_ADMIN : SUGGESTIONS_PUBLIC;
  const apiUrl = currentMode === "admin" ? "/admin/ai-cs/chat" : "/ai-cs/chat";

  const [isOpen, setIsOpen] = useState<boolean>(() => loadStoredIsOpen(currentMode));
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadStoredMessages(currentMode));
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  const isFirstMountRef = useRef(true);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Simpan state messages ke sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKeys.messages, JSON.stringify(messages));
    } catch (e) {
      console.error("Gagal menyimpan riwayat chat ke storage:", e);
    }
  }, [messages, storageKeys.messages]);

  // Simpan status isOpen ke sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKeys.isOpen, String(isOpen));
    } catch (e) {
      console.error("Gagal menyimpan status chat ke storage:", e);
    }
  }, [isOpen, storageKeys.isOpen]);

  // Scroll restore & scroll updates
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      const savedScrollTop = loadStoredScrollTop(currentMode);
      if (savedScrollTop !== null) {
        container.scrollTop = savedScrollTop;
      } else {
        container.scrollTop = container.scrollHeight;
      }
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading, currentMode]);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || isFirstMountRef.current) return;
    try {
      sessionStorage.setItem(storageKeys.scrollTop, String(container.scrollTop));
    } catch (e) {
      console.error("Gagal menyimpan scroll position:", e);
    }
  }, [storageKeys.scrollTop]);

  // Focus input saat panel dibuka
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setHasNewMessage(false);
    }
  }, [isOpen]);

  // Bangun history untuk Gemini
  const buildGeminiHistory = useCallback((): GeminiHistoryItem[] => {
    const validMessages = messages.filter(
      (m) => !m.id.startsWith("welcome") && !m.isError
    );

    const pairs: GeminiHistoryItem[] = [];
    for (const msg of validMessages) {
      pairs.push({
        role: msg.role,
        parts: [{ text: msg.text }],
      });
    }

    const maxItems = MAX_HISTORY_PAIRS * 2;
    return pairs.slice(-maxItems);
  }, [messages]);

  const sendMessage = useCallback(
    async (textToSend: string) => {
      const text = textToSend.trim();
      if (!text || isLoading) return;

      const userMessage: ChatMessage = {
        id: generateId(),
        role: "user",
        text,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputText("");
      setIsLoading(true);

      try {
        const history = buildGeminiHistory();

        const response = await axios.post(
          apiUrl,
          {
            message: text,
            history,
          },
          {
            headers: { "X-Requested-With": "XMLHttpRequest" },
          }
        );

        if (response.data?.status === "success") {
          const aiMessage: ChatMessage = {
            id: generateId(),
            role: "model",
            text: response.data.message,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, aiMessage]);

          if (!isOpen) {
            setHasNewMessage(true);
          }
        } else {
          throw new Error(response.data?.message ?? "Respons tidak valid.");
        }
      } catch (err: unknown) {
        const axiosErr = err as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        const errText =
          axiosErr?.response?.data?.message ??
          axiosErr?.message ??
          "Terjadi kesalahan. Silakan coba lagi.";

        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: "model",
            text: errText,
            timestamp: new Date(),
            isError: true,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [apiUrl, buildGeminiHistory, isLoading, isOpen]
  );

  const handleSend = () => {
    sendMessage(inputText);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([welcomeMessage]);
    setInputText("");
    try {
      sessionStorage.removeItem(storageKeys.scrollTop);
    } catch {
      // ignore
    }
  };

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const showSuggestions = messages.length <= 1;

  return (
    <>
      {/* ── Panel Chat ── */}
      <div
        ref={panelRef}
        className={cn(
          "fixed bottom-24 right-6 z-50 w-[360px] sm:w-[390px] h-[580px] sm:h-[650px] max-h-[calc(100vh-7.5rem)] flex flex-col",
          "bg-white dark:bg-gray-900",
          "rounded-2xl border border-gray-200 dark:border-gray-700",
          "shadow-[0_20px_60px_rgba(0,0,0,0.18)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)]",
          "transition-all duration-300 ease-out origin-bottom-right",
          isOpen
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-90 pointer-events-none"
        )}
        aria-hidden={!isOpen}
        role="dialog"
        aria-label="AI Customer Service Chat"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-brand-500 to-brand-600 rounded-t-2xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="size-9 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-xs">
                <AiCsIcon className="size-5 text-white" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 size-3 bg-emerald-400 rounded-full border-2 border-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">
                {currentMode === "admin" ? "KameraBot Admin" : "KameraBot"}
              </p>
              <p className="text-[11px] text-white/80">
                {currentMode === "admin"
                  ? "Asisten Pintar CMS • Online"
                  : "AI Customer Service • Online"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Tombol hapus chat */}
            <button
              onClick={handleClearChat}
              title="Hapus percakapan"
              className="size-8 flex items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
            </button>

            {/* Tombol tutup */}
            <button
              onClick={handleToggle}
              title="Tutup chat"
              className="size-8 flex items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 custom-scrollbar"
        >
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {isLoading && <TypingIndicator />}
        </div>

        {/* Quick Suggestion Pills (jika baru buka/hanya welcome message) */}
        {showSuggestions && (
          <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
            <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 mb-1.5 uppercase tracking-wider">
              Pertanyaan Cepat
            </p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => sendMessage(sug)}
                  disabled={isLoading}
                  className="text-xs bg-white dark:bg-gray-800 hover:bg-brand-50 dark:hover:bg-brand-950/40 text-gray-700 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-400 border border-gray-200 dark:border-gray-700 rounded-full px-2.5 py-1 transition-all duration-150 text-left"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-b-2xl">
          <div className="flex gap-2 items-end bg-gray-50 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 p-2 focus-within:border-brand-400 dark:focus-within:border-brand-500 transition-colors">
            <textarea
              ref={inputRef}
              id="ai-chat-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                currentMode === "admin"
                  ? "Tanyakan transaksi, laporan, inventori, stok..."
                  : "Tanyakan tentang kamera atau drone..."
              }
              disabled={isLoading}
              rows={1}
              className={cn(
                "flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-200",
                "placeholder:text-gray-400 dark:placeholder:text-gray-500",
                "resize-none outline-none border-none",
                "max-h-24 overflow-y-auto custom-scrollbar",
                "disabled:opacity-50"
              )}
              style={{ minHeight: "24px" }}
              aria-label="Pesan untuk AI Customer Service"
            />

            <button
              id="ai-chat-send-btn"
              onClick={handleSend}
              disabled={!inputText.trim() || isLoading}
              className={cn(
                "flex-shrink-0 size-8 rounded-lg flex items-center justify-center",
                "transition-all duration-150",
                inputText.trim() && !isLoading
                  ? "bg-brand-500 hover:bg-brand-600 text-white shadow-sm"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
              )}
              title="Kirim pesan (Enter)"
              aria-label="Kirim pesan"
            >
              {isLoading ? (
                <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              ) : (
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── FAB (Floating Action Button) ── */}
      <button
        id="ai-chat-fab"
        onClick={handleToggle}
        title={
          isOpen
            ? "Tutup chat"
            : currentMode === "admin"
            ? "Buka KameraBot Admin AI"
            : "Buka Tanya KameraBot CS"
        }
        aria-label="AI Customer Service"
        className={cn(
          "fixed bottom-6 right-6 z-50",
          "size-14 rounded-full shadow-lg",
          "flex items-center justify-center",
          "transition-all duration-300 ease-out",
          "bg-gradient-to-br from-brand-500 to-brand-600",
          "hover:shadow-[0_8px_25px_rgba(248,114,1,0.4)]",
          "hover:scale-110 active:scale-95"
        )}
      >
        {/* Badge notifikasi pesan baru */}
        {hasNewMessage && !isOpen && (
          <span className="absolute -top-1 -right-1 size-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
        )}

        {/* Icon toggle */}
        <div
          className={cn(
            "transition-all duration-300",
            isOpen ? "rotate-90 scale-90" : "rotate-0 scale-100"
          )}
        >
          {isOpen ? (
            <svg className="size-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <AiCsIcon className="size-6 text-white" />
          )}
        </div>
      </button>
    </>
  );
}
