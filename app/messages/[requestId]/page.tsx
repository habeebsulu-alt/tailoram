'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { OutfitRequest, Message, DesignerProfile, Profile } from '@/lib/types';
import {
  ArrowLeft,
  Send,
  Loader2,
  Scissors,
  User,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  Star,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

export default function MessageChatPage() {
  const params = useParams();
  const requestId = params?.requestId as string;
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();

  const [request, setRequest] = useState<OutfitRequest | null>(null);
  const [designer, setDesigner] = useState<DesignerProfile | null>(null);
  const [clientProfile, setClientProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load request and verify participant
  useEffect(() => {
    async function loadRequestAndMessages() {
      if (!requestId || !user) return;

      try {
        setLoading(true);

        // 1. Fetch request details
        const { data: reqData, error: reqError } = await supabase
          .from('requests')
          .select('*')
          .eq('id', requestId)
          .single();

        if (reqError) throw reqError;
        setRequest(reqData as OutfitRequest);

        // 2. Fetch designer profile
        const { data: dData } = await supabase
          .from('designer_profiles')
          .select('*, profiles:user_id(full_name)')
          .eq('id', reqData.designer_id)
          .single();
        if (dData) setDesigner(dData as DesignerProfile);

        // 3. Fetch client profile
        const { data: cData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', reqData.client_id)
          .single();
        if (cData) setClientProfile(cData as Profile);

        // Verify that current user is participant
        const isClient = user.id === reqData.client_id;
        const isDesigner = dData && dData.user_id === user.id;

        if (!isClient && !isDesigner) {
          router.push('/');
          return;
        }

        // 4. Fetch initial messages
        const { data: msgData, error: msgError } = await supabase
          .from('messages')
          .select('*, sender:sender_id(full_name, role)')
          .eq('request_id', requestId)
          .order('created_at', { ascending: true });

        if (!msgError && msgData) {
          setMessages(msgData as Message[]);
        }
      } catch (err) {
        console.error('Error loading chat:', err);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      if (!user) {
        router.push(`/login?redirect=/messages/${requestId}`);
      } else {
        loadRequestAndMessages();
      }
    }
  }, [requestId, user, authLoading, router]);

  // Subscribe to realtime messages
  useEffect(() => {
    if (!requestId) return;

    const channel = supabase
      .channel(`request-chat-${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `request_id=eq.${requestId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;

          // Fetch sender details if needed
          const { data: senderData } = await supabase
            .from('profiles')
            .select('full_name, role')
            .eq('id', newMsg.sender_id)
            .single();

          if (senderData) {
            newMsg.sender = senderData as Profile;
          }

          setMessages((prev) => {
            // Avoid duplicate if already added optimistically
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId]);

  // Auto scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !requestId || sending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            request_id: requestId,
            sender_id: user.id,
            content: messageText,
          },
        ])
        .select('*, sender:sender_id(full_name, role)')
        .single();

      if (error) throw error;

      if (data) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.id)) return prev;
          return [...prev, data as Message];
        });
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      alert('Could not send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-4">
        <h2 className="text-xl font-bold text-stone-900">Request Not Found</h2>
        <Link href="/" className="text-brand-600 font-semibold text-sm hover:underline">
          Return to Marketplace
        </Link>
      </div>
    );
  }

  const isClient = user?.id === request.client_id;
  const partnerName = isClient
    ? designer?.business_name || 'Designer'
    : clientProfile?.full_name || 'Client';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 h-[calc(100vh-5rem)] flex flex-col gap-4">
      
      {/* Top Header & Request Context */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={isClient ? '/requests' : '/dashboard'}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-stone-900 text-base sm:text-lg">
                {partnerName}
              </h1>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  request.status === 'accepted'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : request.status === 'pending'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : request.status === 'completed'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-stone-100 text-stone-600'
                }`}
              >
                {request.status}
              </span>
            </div>
            <p className="text-xs text-stone-500 line-clamp-1">
              Outfit: {request.style_description} • ₦{request.budget_min.toLocaleString()}
              {request.budget_max ? ` - ₦${request.budget_max.toLocaleString()}` : ''}
            </p>
          </div>
        </div>

        {/* Quick Link to Designer Profile or Review */}
        <div className="flex items-center gap-2">
          {isClient && designer && (
            <Link
              href={`/designer/${designer.id}`}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 transition-colors"
            >
              View Designer
            </Link>
          )}
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 bg-stone-50/70 border border-stone-200 rounded-2xl p-4 sm:p-6 overflow-y-auto space-y-4">
        
        {/* Request Overview banner inside chat */}
        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 max-w-lg mx-auto shadow-sm text-xs space-y-2 text-stone-600">
          <div className="flex items-center justify-between font-bold text-stone-800 pb-1.5 border-b border-stone-100">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-brand-600" />
              Custom Order Summary
            </span>
            <span>₦{request.budget_min.toLocaleString()}</span>
          </div>
          <p className="text-stone-700 font-medium">{request.style_description}</p>
          {request.fabric && (
            <p><span className="font-semibold text-stone-500">Fabric:</span> {request.fabric}</p>
          )}
          {request.deadline && (
            <p><span className="font-semibold text-stone-500">Needed by:</span> {new Date(request.deadline).toLocaleDateString()}</p>
          )}
          {request.reference_image_url && (
            <div className="pt-2">
              <span className="font-semibold text-stone-500 block mb-1">Reference Style:</span>
              <img
                src={request.reference_image_url}
                alt="Reference Outfit"
                className="w-24 h-24 object-cover rounded-xl border border-stone-200"
              />
            </div>
          )}
        </div>

        {messages.length === 0 ? (
          <div className="py-12 text-center text-xs text-stone-400 space-y-1">
            <MessageSquare className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <p className="font-semibold text-stone-600">No messages in this thread yet.</p>
            <p>Start the conversation about measurements, fittings, or fabrics below.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-md px-4 py-2.5 rounded-2xl text-xs sm:text-sm shadow-sm ${
                    isMe
                      ? 'bg-brand-600 text-white rounded-br-none'
                      : 'bg-white border border-stone-200 text-stone-900 rounded-bl-none'
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
                <span className="text-[10px] text-stone-400 px-1 mt-1 font-medium">
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Box */}
      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={`Message ${partnerName}...`}
          className="flex-1 px-4 py-3 rounded-2xl border border-stone-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white shadow-sm"
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || sending}
          className="p-3 sm:px-5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-brand-600/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {sending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <span className="hidden sm:inline">Send</span>
              <Send className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

    </div>
  );
}
