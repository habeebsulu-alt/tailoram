'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  Sparkles,
  Send,
  Camera,
  Image as ImageIcon,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Loader2,
  X,
  AlertCircle,
  Scissors,
  Clock,
  Coins,
  CheckCircle2,
  Trash2,
  Layers,
} from 'lucide-react';
import { prepareImageFile, compressImage, isValidImageFile } from '@/lib/imageCompressor';

interface ChatMessage {
  id: string;
  sender: 'tailor' | 'assistant';
  text: string;
  imageUrl?: string | null;
  timestamp: string;
  modelUsed?: string;
  feedback?: 'up' | 'down' | null;
  feedbackSubmitted?: boolean;
}

interface TailorAssistantChatProps {
  tailorId: string;
  tailorName?: string;
  onClose?: () => void;
}

export default function TailorAssistantChat({
  tailorId,
  tailorName = 'Master Tailor',
  onClose,
}: TailorAssistantChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [friendlyError, setFriendlyError] = useState<string | null>(null);
  const [lastFailedPayload, setLastFailedPayload] = useState<{ text: string; imageFile: File | null } | null>(null);

  // Daily quota tracking (15 questions per day)
  const [usedToday, setUsedToday] = useState(0);
  const [dailyLimitReached, setDailyLimitReached] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Storage key for persistent chat history
  const storageKey = `tailoram_assistant_history_${tailorId}`;
  const quotaKey = `tailoram_assistant_quota_${tailorId}_${new Date().toISOString().slice(0, 10)}`;

  // Load chat history & quota on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedHistory = localStorage.getItem(storageKey);
        if (savedHistory) {
          setMessages(JSON.parse(savedHistory));
        }

        const savedQuota = localStorage.getItem(quotaKey);
        if (savedQuota) {
          const count = parseInt(savedQuota, 10) || 0;
          setUsedToday(count);
          if (count >= 15) {
            setDailyLimitReached(true);
          }
        }
      } catch (err) {
        console.warn('Could not load local assistant history:', err);
      }
    }
  }, [storageKey, quotaKey]);

  // Save chat history to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(messages.slice(-30))); // Keep last 30
      } catch (err) {
        console.warn('Could not persist assistant history:', err);
      }
    }
  }, [messages, storageKey]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Handle Photo Selection with automatic HEIC & WebP compression
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setFriendlyError(null);
    if (!e.target.files || !e.target.files[0]) return;

    const rawFile = e.target.files[0];
    if (!isValidImageFile(rawFile)) {
      setFriendlyError('Please select a valid photo (.jpg, .png, .webp, .heic).');
      return;
    }

    if (rawFile.size > 25 * 1024 * 1024) {
      setFriendlyError('Photo exceeds 25MB limit. Please choose a smaller file.');
      return;
    }

    try {
      // Normalize HEIC to JPEG for immediate browser display
      const normalizedFile = await prepareImageFile(rawFile);
      setSelectedImageFile(normalizedFile);

      if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      setImagePreviewUrl(URL.createObjectURL(normalizedFile));
    } catch (err) {
      console.error('Image selection error:', err);
      setFriendlyError('Could not process this photo. Please try a different image.');
    }
  };

  const removeSelectedImage = () => {
    if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setSelectedImageFile(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Quick Prompt suggestion click
  const handleQuickPrompt = (prompt: string) => {
    setInputText(prompt);
  };

  // Submit question to assistant
  const handleSendMessage = async (retryPayload?: { text: string; imageFile: File | null }) => {
    const textToSend = (retryPayload ? retryPayload.text : inputText).trim();
    const imageToSend = retryPayload ? retryPayload.imageFile : selectedImageFile;

    if (!textToSend && !imageToSend) return;

    if (dailyLimitReached || usedToday >= 15) {
      setFriendlyError("Oga, you have reached your 15 questions limit for today. Your daily quota resets tomorrow at midnight!");
      return;
    }

    setFriendlyError(null);
    setLastFailedPayload(null);
    setIsLoading(true);

    // Create user message
    const userMessageId = `msg_${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMessageId,
      sender: 'tailor',
      text: textToSend,
      imageUrl: imagePreviewUrl,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!retryPayload) {
      setInputText('');
      setSelectedImageFile(null);
      setImagePreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }

    try {
      const formData = new FormData();
      formData.append('question', textToSend);
      formData.append('tailorId', tailorId);

      if (imageToSend) {
        // Compress image before uploading to keep token & payload size low
        const compressed = await compressImage(imageToSend, 1200, 1200, 0.78);
        formData.append('image', compressed, compressed.name);
      }

      const res = await fetch('/api/ask-assistant', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.limitReached) {
          setDailyLimitReached(true);
          setUsedToday(15);
        }
        throw new Error(data.friendlyError || "Oga, we couldn't connect to the tailoring assistant right now. Please tap retry to ask again.");
      }

      // Update quota count
      if (typeof data.usedToday === 'number') {
        setUsedToday(data.usedToday);
        if (typeof window !== 'undefined') {
          localStorage.setItem(quotaKey, String(data.usedToday));
        }
        if (data.usedToday >= 15) {
          setDailyLimitReached(true);
        }
      }

      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: data.interactionId || `ast_${Date.now()}`,
        sender: 'assistant',
        text: data.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: data.modelUsed || 'gemini-3.5-flash-lite',
        feedback: null,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.warn('Assistant error:', err);
      const message = err.message || "Oga, we couldn't connect to the tailoring assistant right now. Please tap retry to ask again.";
      setFriendlyError(message);
      setLastFailedPayload({ text: textToSend, imageFile: imageToSend });
    } finally {
      setIsLoading(false);
    }
  };

  // Record Thumbs Up / Down feedback
  const handleFeedback = async (messageId: string, feedback: 'up' | 'down') => {
    // Optimistic UI update
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, feedback, feedbackSubmitted: true }
          : m
      )
    );

    try {
      await fetch('/api/ask-assistant', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interactionId: messageId,
          feedback,
        }),
      });
    } catch (err) {
      console.warn('Feedback update notice:', err);
    }
  };

  const handleClearChat = () => {
    if (confirm('Clear assistant conversation history?')) {
      setMessages([]);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(storageKey);
      }
    }
  };

  const remainingQuota = Math.max(0, 15 - usedToday);

  return (
    <div className="flex flex-col h-[750px] max-h-[85vh] bg-stone-900 border border-stone-800 rounded-3xl overflow-hidden shadow-2xl text-stone-100 relative">
      {/* Header */}
      <div className="px-4 py-3.5 bg-stone-950 border-b border-stone-800 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-stone-950 shadow-md shadow-amber-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm text-white tracking-wide">
                Co-Tailor
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-extrabold uppercase tracking-wider">
                Flash-Lite
              </span>
            </div>
            <p className="text-[11px] text-stone-400">
              Nigeria&apos;s Workshop &amp; Cutting Copilot for Tailors
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Daily Quota Counter Badge */}
          <div
            title="Limit of 15 questions per tailor per day"
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border transition-colors ${
              dailyLimitReached
                ? 'bg-red-500/10 border-red-500/30 text-red-300'
                : 'bg-stone-800 border-stone-700 text-stone-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {dailyLimitReached ? 'Daily Limit Reached' : `${remainingQuota} of 15 left today`}
            </span>
          </div>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearChat}
              title="Clear chat history"
              className="p-2 text-stone-400 hover:text-stone-200 hover:bg-stone-800/80 rounded-xl transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-white hover:bg-stone-800/80 rounded-xl transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile-only Daily Quota indicator */}
      <div className="sm:hidden px-4 py-1.5 bg-stone-950/80 border-b border-stone-800/60 flex items-center justify-between text-[11px] text-stone-400">
        <span>Daily Quota</span>
        <span className={dailyLimitReached ? 'text-red-400 font-bold' : 'text-amber-400 font-bold'}>
          {dailyLimitReached ? '0/15 remaining (resets tomorrow)' : `${remainingQuota} of 15 questions left today`}
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 max-w-md mx-auto space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Scissors className="w-8 h-8 -rotate-45" />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-base font-black text-white">
                How can Co-Tailor assist your workshop today, {tailorName}?
              </h4>
              <p className="text-xs text-stone-400 leading-relaxed">
                Upload a client's inspiration photo for a breakdown of style details, fabric needed, cutting steps, and suggested price range in Naira.
              </p>
            </div>

            {/* Quick Prompt Suggestion Chips */}
            <div className="w-full space-y-2 pt-2">
              <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider text-left">
                Suggested Questions:
              </p>
              <div className="flex flex-col gap-2">
                {[
                  "How much should I charge for 3-piece Agbada with chest embroidery?",
                  "How many yards of cashmere for a 6ft 2in Senator suit?",
                  "What is the best way to line and bone an Owambe lace corset gown?",
                  "Rough timeline & fabric estimate for a double-wrapper bridal George outfit?",
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleQuickPrompt(chip)}
                    className="text-left px-3.5 py-2.5 rounded-2xl bg-stone-800/80 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-700/80 text-xs transition-all flex items-center justify-between group"
                  >
                    <span>{chip}</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 opacity-60 group-hover:opacity-100 shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'tailor' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                  msg.sender === 'tailor'
                    ? 'bg-amber-600 text-white rounded-br-xs shadow-md'
                    : 'bg-stone-800/95 text-stone-100 border border-stone-700/80 rounded-bl-xs shadow-sm'
                }`}
              >
                {/* Optional Image Thumbnail */}
                {msg.imageUrl && (
                  <div className="mb-3 rounded-xl overflow-hidden border border-black/20 max-w-xs aspect-square relative bg-stone-900">
                    <img
                      src={msg.imageUrl}
                      alt="Uploaded inspiration"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Formatted Message Content */}
                <div className="whitespace-pre-wrap leading-relaxed space-y-1">
                  {msg.text}
                </div>

                {/* Assistant Metadata & Feedback Controls */}
                {msg.sender === 'assistant' && (
                  <div className="mt-3 pt-2.5 border-t border-stone-700/80 flex items-center justify-between gap-3 text-[11px] text-stone-400 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>Co-Tailor Guide • {msg.timestamp}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-stone-500 mr-1">Helpful?</span>
                      <button
                        type="button"
                        onClick={() => handleFeedback(msg.id, 'up')}
                        title="Helpful advice (Thumbs Up)"
                        className={`p-1.5 rounded-lg border transition-all ${
                          msg.feedback === 'up'
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                            : 'bg-stone-900 border-stone-700 text-stone-400 hover:text-white'
                        }`}
                      >
                        <ThumbsUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFeedback(msg.id, 'down')}
                        title="Needs improvement (Thumbs Down)"
                        className={`p-1.5 rounded-lg border transition-all ${
                          msg.feedback === 'down'
                            ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                            : 'bg-stone-900 border-stone-700 text-stone-400 hover:text-white'
                        }`}
                      >
                        <ThumbsDown className="w-3 h-3" />
                      </button>

                      {msg.feedbackSubmitted && (
                        <span className="text-[10px] text-emerald-400 font-medium ml-1 animate-in fade-in">
                          Thanks!
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {msg.sender === 'tailor' && (
                  <span className="block text-[10px] text-amber-200/80 text-right mt-1.5">
                    {msg.timestamp}
                  </span>
                )}
              </div>
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-start gap-3 animate-in fade-in">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-1">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-stone-800/90 border border-stone-700/80 rounded-2xl rounded-bl-xs p-4 text-xs sm:text-sm text-stone-300 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-amber-300 text-xs">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                <span>Co-Tailor is consulting pattern &amp; pricing benchmark data...</span>
              </div>
              <p className="text-[11px] text-stone-400">
                Calculating fabric yardage, breakdown steps, and Nigerian market price range.
              </p>
            </div>
          </div>
        )}

        {/* Friendly Error State with 1-Tap Retry */}
        {friendlyError && (
          <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{friendlyError}</span>
            </div>
            {lastFailedPayload && (
              <button
                type="button"
                onClick={() => handleSendMessage(lastFailedPayload)}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shrink-0 flex items-center gap-1 transition-all"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Selected Image Thumbnail Preview before sending */}
      {imagePreviewUrl && (
        <div className="px-4 py-2 bg-stone-950/90 border-t border-stone-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden border border-stone-700 relative bg-stone-900">
              <img
                src={imagePreviewUrl}
                alt="Selected preview"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-stone-200 line-clamp-1">
                {selectedImageFile?.name || 'Inspiration Photo Attached'}
              </p>
              <p className="text-[10px] text-emerald-400 font-medium">
                Photo ready for style &amp; pricing breakdown
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={removeSelectedImage}
            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors"
            title="Remove attached photo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Daily limit reached banner */}
      {dailyLimitReached && (
        <div className="px-4 py-2 bg-stone-950 border-t border-red-500/30 text-red-300 text-xs font-medium text-center">
          ✦ You've used your 15 questions for today. Your quota resets tomorrow at midnight!
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3 bg-stone-950 border-t border-stone-800 flex items-center gap-2 shrink-0"
      >
        <input
          type="file"
          ref={fileInputRef}
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
          onChange={handleImageSelect}
          className="hidden"
          disabled={isLoading || dailyLimitReached}
        />

        {/* Photo Upload Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || dailyLimitReached}
          title="Upload client's inspiration photo (.jpg, .png, .webp, .heic)"
          className={`p-2.5 rounded-2xl border transition-all flex items-center justify-center shrink-0 ${
            selectedImageFile
              ? 'bg-amber-500 text-stone-950 border-amber-400'
              : 'bg-stone-900 border-stone-700 text-stone-300 hover:text-white hover:bg-stone-800 disabled:opacity-40'
          }`}
        >
          <Camera className="w-5 h-5" />
        </button>

        {/* Text Input */}
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            dailyLimitReached
              ? 'Daily quota reached (15/15). Resets tomorrow.'
              : selectedImageFile
              ? 'Ask anything about this outfit or leave blank for full breakdown...'
              : 'Ask about yardage, pricing, Agbada cutting formulas...'
          }
          disabled={isLoading || dailyLimitReached}
          className="flex-1 bg-stone-900 border border-stone-800 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder-stone-500 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/80 disabled:opacity-50"
        />

        {/* Send Button */}
        <button
          type="submit"
          disabled={isLoading || dailyLimitReached || (!inputText.trim() && !selectedImageFile)}
          className="p-3 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:bg-stone-800 disabled:text-stone-600 text-stone-950 font-black transition-all flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20 active:scale-95"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </form>
    </div>
  );
}
