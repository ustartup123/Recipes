"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { getAquariums } from "@/lib/firestore";
import type { Aquarium, AIChatMessage, ChatImage } from "@/lib/types";
import { Bot, Send, ChevronDown, Sparkles, AlertCircle, ImagePlus, X } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { processImages, MAX_IMAGES } from "@/lib/image-utils";

const SUGGESTED_QUESTIONS = [
  "Analyze my latest water parameters",
  "Is my pH trending in a safe direction?",
  "When should I do my next water change?",
  "My ammonia is elevated — what should I do?",
  "How are my parameters compared to ideal?",
];

export default function AdvisorPage() {
  return (
    <Suspense fallback={<AppShell><div className="flex justify-center py-16"><LoadingSpinner className="h-8 w-8" /></div></AppShell>}>
      <AdvisorPageInner />
    </Suspense>
  );
}

function AdvisorPageInner() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const analysisIdParam = searchParams.get("analysisId");
  const aquariumIdParam = searchParams.get("aquariumId");

  const [aquariums, setAquariums] = useState<Aquarium[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingImages, setPendingImages] = useState<ChatImage[]>([]);
  const [analysisAutoSent, setAnalysisAutoSent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    getAquariums(user.uid).then((list) => {
      setAquariums(list);
      // If aquariumId is in URL params, select that tank
      if (aquariumIdParam && list.some((a) => a.id === aquariumIdParam)) {
        setSelectedId(aquariumIdParam);
      } else if (list.length > 0) {
        setSelectedId(list[0].id);
      }
    });
  }, [user, aquariumIdParam]);

  useEffect(() => {
    if (!selectedId) return;
    // Only clear messages on manual tank switch, not on initial load with analysisId
    if (!analysisIdParam || analysisAutoSent) {
      setMessages([]);
    }
  }, [selectedId, analysisIdParam, analysisAutoSent]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-send analysis discussion when navigated from analysis page
  const sendMessageRef = useRef<((text: string) => Promise<void>) | null>(null);

  useEffect(() => {
    if (analysisIdParam && selectedId && !analysisAutoSent && !loading && user && sendMessageRef.current) {
      setAnalysisAutoSent(true);
      sendMessageRef.current("I'd like to discuss my latest water quality analysis. What are your thoughts and recommendations?");
    }
  }, [analysisIdParam, selectedId, analysisAutoSent, loading, user]);

  const selectedAquarium = aquariums.find((a) => a.id === selectedId);

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const remaining = MAX_IMAGES - pendingImages.length;
      if (remaining <= 0) {
        setError(`Maximum ${MAX_IMAGES} images per message`);
        return;
      }
      const filesToProcess = Array.from(files).slice(0, remaining);
      const processed = await processImages(filesToProcess);
      setPendingImages((prev) => [...prev, ...processed.map((p) => ({ base64: p.base64, mimeType: p.mimeType }))]);
    } catch {
      setError("Failed to process image(s)");
    }

    // Reset file input so user can select the same file again
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removePendingImage(index: number) {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  }

  const sendMessage = useCallback(async function sendMessage(text: string) {
    if ((!text.trim() && pendingImages.length === 0) || loading || !user) return;
    setError(null);

    const images = pendingImages.length > 0 ? [...pendingImages] : undefined;

    const userMsg: AIChatMessage = {
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
      images,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setPendingImages([]);
    setLoading(true);

    try {
      const token = await user.getIdToken();

      // Build request body with optional images and analysisId
      const requestBody: Record<string, unknown> = {
        aquariumId: selectedId,
        question: text.trim() || "Please analyze these images of my aquarium.",
      };

      // Include analysisId if this is an analysis-initiated conversation
      if (analysisIdParam && !analysisAutoSent) {
        requestBody.analysisId = analysisIdParam;
      }

      if (images && images.length > 0) {
        requestBody.images = images.map((img) => ({
          base64: img.base64,
          mimeType: img.mimeType,
        }));
      }

      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      const assistantMsg: AIChatMessage = {
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errMsg);
      // Remove the user message on error and restore input + images
      setMessages((prev) => prev.slice(0, -1));
      setInput(text);
      if (images) setPendingImages(images);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedId, loading, pendingImages, analysisIdParam, analysisAutoSent]);

  // Keep ref updated for use in the auto-send effect
  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <AppShell>
      <div className="flex flex-col h-[calc(100vh-7rem)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center">
              <Bot className="h-5 w-5 text-teal-400" />
            </div>
            <div>
              <h1 className="section-title text-xl">AI Advisor</h1>
              <p className="text-xs text-slate-500">Powered by Gemini</p>
            </div>
          </div>

          {/* Aquarium selector */}
          {aquariums.length > 1 && (
            <div className="relative">
              <select
                className="select pr-8 text-sm"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {aquariums.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Current tank info strip */}
        {selectedAquarium && (
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg mb-3 text-xs text-slate-400">
            <Sparkles className="h-3.5 w-3.5 text-teal-400 flex-shrink-0" />
            Analyzing:{" "}
            <strong className="text-slate-300">{selectedAquarium.name}</strong>
            <span className="text-slate-600">·</span>
            Events and parameters loaded server-side
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg mb-3 text-xs text-red-400">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="h-16 w-16 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-4">
                <Bot className="h-8 w-8 text-teal-400" />
              </div>
              <h3 className="font-bold font-mono text-slate-200 mb-2">
                Ask me anything about your tank
              </h3>
              <p className="text-sm text-slate-500 mb-6 max-w-sm">
                I can analyze your water parameters, suggest when to do water changes, help troubleshoot issues, and examine photos of your tank.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === "assistant" && (
                  <div className="h-7 w-7 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mr-3 flex-shrink-0 mt-1">
                    <Bot className="h-4 w-4 text-teal-400" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
                    msg.role === "user"
                      ? "bg-teal-500/15 border border-teal-500/20 text-slate-200 rounded-tr-sm"
                      : "bg-slate-800 border border-slate-700 text-slate-300 rounded-tl-sm"
                  )}
                >
                  {/* Image thumbnails */}
                  {msg.images && msg.images.length > 0 && (
                    <div className="flex gap-2 mb-2 flex-wrap">
                      {msg.images.map((img, imgIdx) => (
                        <img
                          key={imgIdx}
                          src={img.url || img.base64}
                          alt={`Attached image ${imgIdx + 1}`}
                          className="h-20 w-20 object-cover rounded-lg border border-slate-600"
                        />
                      ))}
                    </div>
                  )}
                  {msg.content && (
                    <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                  )}
                  <div className="text-xs text-slate-600 mt-2">
                    {formatDate(msg.timestamp)}
                  </div>
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="h-7 w-7 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mr-3 flex-shrink-0 mt-1">
                <Bot className="h-4 w-4 text-teal-400" />
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Pending image previews */}
        {pendingImages.length > 0 && (
          <div className="flex gap-2 mb-2 px-1 flex-wrap">
            {pendingImages.map((img, i) => (
              <div key={i} className="relative group">
                <img
                  src={img.base64}
                  alt={`Pending image ${i + 1}`}
                  className="h-16 w-16 object-cover rounded-lg border border-slate-700"
                />
                <button
                  onClick={() => removePendingImage(i)}
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  aria-label="Remove image"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              </div>
            ))}
            {pendingImages.length < MAX_IMAGES && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="h-16 w-16 rounded-lg border border-dashed border-slate-700 flex items-center justify-center text-slate-600 hover:text-slate-400 hover:border-slate-500 transition-colors cursor-pointer"
                aria-label="Add another image"
              >
                <ImagePlus className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Input area */}
        <div className="flex gap-3 items-end">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || !selectedId || pendingImages.length >= MAX_IMAGES}
            className="h-11 w-11 flex items-center justify-center flex-shrink-0 rounded-xl border border-slate-700 hover:border-slate-600 text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Attach images"
            title={`Attach images (${pendingImages.length}/${MAX_IMAGES})`}
          >
            <ImagePlus className="h-4 w-4" />
          </button>
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              className="input resize-none pr-12 min-h-[44px] max-h-32"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={pendingImages.length > 0 ? "Add a message about your images... (Enter to send)" : "Ask about your water parameters... (Enter to send)"}
              disabled={loading || !selectedId}
            />
          </div>
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || (!input.trim() && pendingImages.length === 0) || !selectedId}
            className="btn-primary h-11 w-11 flex items-center justify-center flex-shrink-0 rounded-xl"
            aria-label="Send message"
          >
            {loading ? <LoadingSpinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-xs text-slate-700 text-center mt-2">
          AI advice is not a substitute for professional aquatic consultation.
        </p>
      </div>
    </AppShell>
  );
}
