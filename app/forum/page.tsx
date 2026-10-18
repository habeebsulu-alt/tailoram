'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  ForumThread,
  ForumReply,
  ForumCategory,
  ForumThreadType,
  FORUM_CATEGORIES,
} from '@/lib/types';
import {
  fetchForumThreads,
  createForumThread,
  addForumReply,
  toggleUpvoteThread,
  toggleHelpfulReply,
  toggleMarkSolution,
  incrementThreadView,
} from '@/lib/forumManager';
import {
  Scissors,
  MessageSquare,
  Sparkles,
  HelpCircle,
  Layers,
  Settings,
  DollarSign,
  TrendingUp,
  Search,
  CheckCircle2,
  Clock,
  Pin,
  ThumbsUp,
  Share2,
  Filter,
  Plus,
  X,
  Send,
  Eye,
  Award,
  ChevronRight,
  MapPin,
  ShieldCheck,
  Check,
  Image as ImageIcon,
  ExternalLink,
  Flame,
  MessageCircle,
} from 'lucide-react';

export default function ForumPage() {
  const { user, profile, designerProfile } = useAuth();
  const router = useRouter();

  // Data States
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedThread, setSelectedThread] = useState<ForumThread | null>(null);

  // Filter & Search States
  const [selectedCategory, setSelectedCategory] = useState<ForumCategory | 'all'>('all');
  const [selectedType, setSelectedType] = useState<ForumThreadType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'trending' | 'newest' | 'replies'>('trending');
  const [onlySolved, setOnlySolved] = useState(false);

  // New Thread Modal State
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<ForumCategory>('troubleshooting');
  const [newType, setNewType] = useState<ForumThreadType>('advice_needed');
  const [newContent, setNewContent] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [isSubmittingThread, setIsSubmittingThread] = useState(false);

  // Reply Input State
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Toast / Feedback State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load threads on mount
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const data = await fetchForumThreads();
        setThreads(data);
      } catch (err) {
        console.error('Failed to load forum threads:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filtered & Sorted Threads
  const filteredThreads = useMemo(() => {
    return threads
      .filter((t) => {
        if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
        if (selectedType !== 'all' && t.thread_type !== selectedType) return false;
        if (onlySolved && !t.is_solved) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = t.title.toLowerCase().includes(q);
          const matchContent = t.content.toLowerCase().includes(q);
          const matchAuthor = t.author_name.toLowerCase().includes(q);
          const matchStudio = (t.author_studio || '').toLowerCase().includes(q);
          const matchState = (t.author_state || '').toLowerCase().includes(q);
          const matchTags = (t.tags || []).some((tag) => tag.toLowerCase().includes(q));
          return matchTitle || matchContent || matchAuthor || matchStudio || matchState || matchTags;
        }
        return true;
      })
      .sort((a, b) => {
        // Pinned threads always stick to top
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;

        if (sortBy === 'trending') {
          return ((b.upvotes_count || 0) * 2 + (b.replies_count || 0) * 3) -
                 ((a.upvotes_count || 0) * 2 + (a.replies_count || 0) * 3);
        }
        if (sortBy === 'replies') {
          return (b.replies_count || 0) - (a.replies_count || 0);
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [threads, selectedCategory, selectedType, searchQuery, sortBy, onlySolved]);

  // Open Thread Detail
  const handleOpenThread = async (thread: ForumThread) => {
    setSelectedThread(thread);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      await incrementThreadView(thread.id);
      setThreads((prev) =>
        prev.map((t) => (t.id === thread.id ? { ...t, views_count: (t.views_count || 0) + 1 } : t))
      );
    } catch {}
  };

  // Upvote Thread
  const handleUpvote = async (threadId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const newCount = await toggleUpvoteThread(threadId);
      setThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, upvotes_count: newCount } : t))
      );
      if (selectedThread && selectedThread.id === threadId) {
        setSelectedThread((prev) => (prev ? { ...prev, upvotes_count: newCount } : null));
      }
    } catch {
      showToast('Could not register vote.');
    }
  };

  // Helpful Reply Vote
  const handleHelpfulReply = async (threadId: string, replyId: string) => {
    try {
      const newCount = await toggleHelpfulReply(threadId, replyId);
      if (selectedThread && selectedThread.replies) {
        const updatedReplies = selectedThread.replies.map((r) =>
          r.id === replyId ? { ...r, helpful_count: newCount } : r
        );
        setSelectedThread({ ...selectedThread, replies: updatedReplies });
      }
      showToast('Marked as helpful advice!');
    } catch {
      showToast('Could not register advice vote.');
    }
  };

  // Toggle Mark Solution
  const handleMarkSolution = async (threadId: string, replyId: string) => {
    try {
      const isSolution = await toggleMarkSolution(threadId, replyId);
      if (selectedThread && selectedThread.replies) {
        const updatedReplies = selectedThread.replies.map((r) => ({
          ...r,
          is_solution: r.id === replyId ? isSolution : false,
        }));
        const updatedThread = {
          ...selectedThread,
          is_solved: isSolution,
          replies: updatedReplies,
        };
        setSelectedThread(updatedThread);
        setThreads((prev) =>
          prev.map((t) => (t.id === threadId ? updatedThread : t))
        );
      }
      showToast(isSolution ? 'Marked as solved tailoring solution!' : 'Solution status un-marked.');
    } catch {
      showToast('Could not update solution status.');
    }
  };

  // Create New Thread
  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      showToast('Please provide a title and detailed question/topic.');
      return;
    }

    try {
      setIsSubmittingThread(true);
      const parsedTags = newTags
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      const authorName = profile?.full_name || user?.email?.split('@')[0] || 'Master Artisan';
      const authorRole = profile?.role || 'designer';
      const authorStudio = designerProfile?.business_name || (authorRole === 'designer' ? 'Bespoke Studio' : undefined);
      const authorState = designerProfile?.state || 'Lagos';

      const created = await createForumThread({
        title: newTitle.trim(),
        category: newCategory,
        thread_type: newType,
        tags: parsedTags.length > 0 ? parsedTags : ['Tailoring', 'Craft'],
        content: newContent.trim(),
        author_id: user?.id || 'demo-artisan',
        author_name: authorName,
        author_role: authorRole,
        author_studio: authorStudio,
        author_state: authorState,
        author_verified: !!designerProfile?.is_verified,
        media_url: newMediaUrl.trim() || undefined,
        media_type: newMediaUrl.trim() ? 'image' : undefined,
      });

      setThreads((prev) => [created, ...prev]);
      setIsNewModalOpen(false);
      setNewTitle('');
      setNewContent('');
      setNewTags('');
      setNewMediaUrl('');
      showToast('Discussion published to the Tailors Guild!');
      setSelectedThread(created);
    } catch (err: any) {
      showToast(err.message || 'Failed to publish discussion.');
    } finally {
      setIsSubmittingThread(false);
    }
  };

  // Post Reply
  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThread) return;
    if (!replyContent.trim()) {
      showToast('Please write your advice before posting.');
      return;
    }

    try {
      setIsSubmittingReply(true);
      const authorName = profile?.full_name || user?.email?.split('@')[0] || 'Artisan Colleague';
      const authorRole = profile?.role || 'designer';
      const authorStudio = designerProfile?.business_name || (authorRole === 'designer' ? 'Artisan Studio' : undefined);
      const authorState = designerProfile?.state || 'Nigeria';

      const newReply = await addForumReply(selectedThread.id, {
        author_id: user?.id || 'artisan-user',
        author_name: authorName,
        author_role: authorRole,
        author_studio: authorStudio,
        author_state: authorState,
        author_verified: !!designerProfile?.is_verified,
        content: replyContent.trim(),
      });

      if (newReply) {
        const updatedReplies = [...(selectedThread.replies || []), newReply];
        const updatedThread = {
          ...selectedThread,
          replies: updatedReplies,
          replies_count: updatedReplies.length,
        };
        setSelectedThread(updatedThread);
        setThreads((prev) =>
          prev.map((t) => (t.id === selectedThread.id ? updatedThread : t))
        );
        setReplyContent('');
        showToast('Your tailoring advice has been posted!');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to submit advice.');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Helper formatting
  const formatTimeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
  };

  const getCategoryMeta = (catId: ForumCategory) => {
    return FORUM_CATEGORIES.find((c) => c.id === catId) || FORUM_CATEGORIES[0];
  };

  const getThreadTypeBadge = (type: ForumThreadType) => {
    switch (type) {
      case 'advice_needed':
        return { label: 'Needs Advice', bg: 'bg-rose-500/15 text-rose-300 border-rose-500/30' };
      case 'pro_tip':
        return { label: 'Pro Tip', bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
      case 'showcase':
        return { label: 'Fit Check', bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
      default:
        return { label: 'Discussion', bg: 'bg-blue-500/15 text-blue-300 border-blue-500/30' };
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 pb-28">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 right-6 z-50 bg-stone-900 border border-amber-500/50 text-amber-300 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-bold animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Hero Banner */}
      <section className="relative overflow-hidden border-b border-stone-800/80 bg-gradient-to-b from-stone-900 via-stone-950 to-stone-950 pt-12 pb-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-64 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold tracking-wider uppercase">
                <Scissors className="w-3.5 h-3.5" />
                <span>Nigeria Master Tailors Guild &amp; Artisan Hub</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
                Connect, Learn &amp; Share <br className="hidden sm:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500">
                  Tailoring Advice
                </span>
              </h1>
              <p className="text-stone-300 text-sm sm:text-base leading-relaxed">
                The open community for Nigerian fashion designers and master tailors. Discuss pattern drafting secrets, Balogun &amp; Aba fabric market prices, sewing machine setups, and solve complex fitting challenges together.
              </p>
            </div>

            {/* Quick Action Button */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={() => setIsNewModalOpen(true)}
                className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-black text-sm shadow-xl shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Start Discussion / Ask Advice</span>
              </button>
            </div>

          </div>

          {/* Quick Metrics Ticker */}
          <div className="mt-8 pt-6 border-t border-stone-800/60 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg font-black text-white">{threads.length}</div>
                <div className="text-xs text-stone-400">Master Discussions</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg font-black text-white">
                  {threads.filter((t) => t.is_solved).length}
                </div>
                <div className="text-xs text-stone-400">Solved Fitting Queries</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Scissors className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg font-black text-white">36 States</div>
                <div className="text-xs text-stone-400">Artisans Connected</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg font-black text-white">Zero-Fee</div>
                <div className="text-xs text-stone-400">Peer Knowledge Sharing</div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Main Forum Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">

        {/* THREAD DETAIL MODAL / DRAWER IF SELECTED */}
        {selectedThread && (
          <div className="mb-12 bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative animate-fadeIn">
            
            <div className="flex items-center justify-between pb-6 border-b border-stone-800">
              <button
                onClick={() => setSelectedThread(null)}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition-colors"
              >
                <span>← Back to All Discussions</span>
              </button>

              <div className="flex items-center gap-2">
                {selectedThread.is_pinned && (
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold flex items-center gap-1 border border-amber-500/30">
                    <Pin className="w-3.5 h-3.5" />
                    <span>Pinned Master Post</span>
                  </span>
                )}
                {selectedThread.is_solved && (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center gap-1 border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Solved Advice</span>
                  </span>
                )}
              </div>
            </div>

            {/* Main Thread Content */}
            <div className="pt-6 space-y-6">
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-stone-800 text-stone-300 text-xs font-semibold">
                    {getCategoryMeta(selectedThread.category).label}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getThreadTypeBadge(selectedThread.thread_type).bg}`}>
                    {getThreadTypeBadge(selectedThread.thread_type).label}
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                  {selectedThread.title}
                </h2>

                {/* Author Card Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 py-3 px-4 rounded-2xl bg-stone-950/80 border border-stone-800/80 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 text-stone-950 font-black flex items-center justify-center text-sm shadow">
                      {selectedThread.author_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-white">
                        <span>{selectedThread.author_name}</span>
                        {selectedThread.author_verified && (
                          <span title="Verified Master Designer">
                            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                          </span>
                        )}
                        <span className="text-[10px] uppercase font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400">
                          {selectedThread.author_role}
                        </span>
                      </div>
                      <div className="text-stone-400 text-[11px] flex items-center gap-1">
                        {selectedThread.author_studio && <span>{selectedThread.author_studio} •</span>}
                        {selectedThread.author_state && (
                          <span className="flex items-center gap-0.5">
                            <MapPin className="w-3 h-3 text-stone-500" />
                            {selectedThread.author_state}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-stone-400">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      {formatTimeAgo(selectedThread.created_at)}
                    </span>
                    <button
                      onClick={() => handleUpvote(selectedThread.id)}
                      className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-amber-500/20 hover:text-amber-300 text-stone-200 border border-stone-700 font-bold transition-all flex items-center gap-1.5"
                    >
                      <ThumbsUp className="w-3.5 h-3.5 text-amber-400" />
                      <span>{selectedThread.upvotes_count || 0} Endorsements</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Thread Content Text */}
              <div className="text-stone-200 text-sm sm:text-base leading-relaxed whitespace-pre-line bg-stone-950/40 p-5 rounded-2xl border border-stone-800/40 font-normal">
                {selectedThread.content}
              </div>

              {/* Attached Media / Photos */}
              {selectedThread.media_url && (
                <div className="relative rounded-2xl overflow-hidden border border-stone-800 max-w-lg">
                  <img
                    src={selectedThread.media_url}
                    alt={selectedThread.title}
                    className="w-full h-auto object-cover max-h-96"
                  />
                  <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-stone-950/80 backdrop-blur text-[11px] text-stone-300 font-medium">
                    Attached Work / Reference Photo
                  </div>
                </div>
              )}

              {/* Tags */}
              {selectedThread.tags && selectedThread.tags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap pt-2">
                  {selectedThread.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-lg bg-stone-950 text-stone-400 text-xs border border-stone-800 font-mono"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* REPLIES SECTION */}
              <div className="pt-8 border-t border-stone-800 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-amber-400" />
                    <span>Artisan Advice &amp; Responses ({selectedThread.replies?.length || 0})</span>
                  </h3>
                  <span className="text-xs text-stone-400">
                    Peer advice from verified Nigerian tailors
                  </span>
                </div>

                {/* Reply Form */}
                <form onSubmit={handlePostReply} className="space-y-3 bg-stone-950 p-4 rounded-2xl border border-stone-800">
                  <label className="block text-xs font-bold text-stone-300">
                    Contribute Your Professional Tailoring Advice
                  </label>
                  <textarea
                    rows={3}
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Share your cutting formula, machine advice, or fabric sourcing technique..."
                    className="w-full p-3 rounded-xl bg-stone-900 border border-stone-800 text-xs text-white placeholder:text-stone-500 focus:outline-none focus:border-amber-400"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-stone-400">
                      Posting as <span className="font-bold text-amber-300">{profile?.full_name || 'Artisan Colleague'}</span>
                    </span>
                    <button
                      type="submit"
                      disabled={isSubmittingReply}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 text-xs font-black shadow-md transition-all flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSubmittingReply ? 'Posting...' : 'Post Advice'}</span>
                    </button>
                  </div>
                </form>

                {/* List of Replies */}
                <div className="space-y-4 pt-2">
                  {(!selectedThread.replies || selectedThread.replies.length === 0) ? (
                    <div className="p-8 text-center text-stone-500 text-xs rounded-2xl bg-stone-950/60 border border-stone-800">
                      No responses posted yet. Be the first master tailor to offer guidance on this topic!
                    </div>
                  ) : (
                    selectedThread.replies.map((reply) => (
                      <div
                        key={reply.id}
                        className={`p-5 rounded-2xl border transition-all ${
                          reply.is_solution
                            ? 'bg-emerald-950/20 border-emerald-500/40'
                            : 'bg-stone-950 border-stone-800'
                        }`}
                      >
                        {reply.is_solution && (
                          <div className="mb-3 px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold inline-flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Marked as Best Tailoring Advice / Solution</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-4 mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-stone-800 text-amber-400 font-bold flex items-center justify-center text-xs">
                              {reply.author_name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                <span>{reply.author_name}</span>
                                {reply.author_verified && (
                                  <ShieldCheck className="w-3 h-3 text-amber-400" />
                                )}
                              </div>
                              <div className="text-[11px] text-stone-400 flex items-center gap-1">
                                {reply.author_studio && <span>{reply.author_studio} •</span>}
                                <span>{reply.author_state || 'Nigeria'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-[11px] text-stone-400 font-mono">
                            {formatTimeAgo(reply.created_at)}
                          </div>
                        </div>

                        <div className="text-stone-300 text-xs sm:text-sm leading-relaxed whitespace-pre-line pl-10">
                          {reply.content}
                        </div>

                        {/* Reply Action Footer */}
                        <div className="mt-4 pt-3 border-t border-stone-800/60 pl-10 flex items-center justify-between gap-2 flex-wrap">
                          <button
                            onClick={() => handleHelpfulReply(selectedThread.id, reply.id)}
                            className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-amber-300 text-xs font-bold border border-stone-800 transition-colors flex items-center gap-1"
                          >
                            <ThumbsUp className="w-3 h-3 text-amber-400" />
                            <span>Helpful Advice ({reply.helpful_count || 0})</span>
                          </button>

                          {(user?.id === selectedThread.author_id || profile?.role === 'admin') && (
                            <button
                              onClick={() => handleMarkSolution(selectedThread.id, reply.id)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                                reply.is_solution
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-stone-900 hover:bg-emerald-500/20 text-stone-400 hover:text-emerald-300 border border-stone-800'
                              }`}
                            >
                              <Check className="w-3 h-3" />
                              <span>{reply.is_solution ? 'Solution Selected' : 'Mark as Solution'}</span>
                            </button>
                          )}
                        </div>

                      </div>
                    ))
                  )}
                </div>

              </div>

            </div>
          </div>
        )}

        {/* Category Pills Header */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-400">
              Browse Topics by Craft Category
            </h3>
            <span className="text-xs text-stone-400">
              Showing <span className="text-white font-bold">{filteredThreads.length}</span> discussions
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`p-3 rounded-2xl border text-left transition-all ${
                selectedCategory === 'all'
                  ? 'bg-amber-500 text-stone-950 font-black border-amber-400 shadow-lg shadow-amber-500/20'
                  : 'bg-stone-900/90 hover:bg-stone-800 text-stone-300 border-stone-800'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span>All Topics</span>
                <Flame className={`w-3.5 h-3.5 ${selectedCategory === 'all' ? 'text-stone-950' : 'text-amber-400'}`} />
              </div>
              <div className={`text-[11px] truncate ${selectedCategory === 'all' ? 'text-stone-900 font-semibold' : 'text-stone-400'}`}>
                {threads.length} posts
              </div>
            </button>

            {FORUM_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const count = threads.filter((t) => t.category === cat.id).length;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'bg-amber-500 text-stone-950 font-black border-amber-400 shadow-lg shadow-amber-500/20'
                      : 'bg-stone-900/90 hover:bg-stone-800 text-stone-300 border-stone-800'
                  }`}
                >
                  <div className="text-xs font-bold truncate mb-1">
                    {cat.label}
                  </div>
                  <div className={`text-[11px] truncate ${isSelected ? 'text-stone-900 font-semibold' : 'text-stone-400'}`}>
                    {count} discussions
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search, Filter & Sort Bar */}
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-4 mb-6 shadow-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-stone-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topics by keyword, technique, Balogun, Senator, Jack F4, Agbada..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white placeholder:text-stone-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Thread Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-300 font-bold focus:outline-none focus:border-amber-400"
            >
              <option value="all">All Types</option>
              <option value="advice_needed">Needs Advice</option>
              <option value="pro_tip">Pro Tips &amp; Tutorials</option>
              <option value="showcase">Fit Checks</option>
              <option value="discussion">Discussions</option>
            </select>

            {/* Solved Filter */}
            <button
              onClick={() => setOnlySolved(!onlySolved)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                onlySolved
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-stone-950 text-stone-400 hover:text-white border-stone-800'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Solved Only</span>
            </button>

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-300 font-bold focus:outline-none focus:border-amber-400"
            >
              <option value="trending">🔥 Trending</option>
              <option value="newest">🕒 Newest</option>
              <option value="replies">💬 Most Discussed</option>
            </select>
          </div>

        </div>

        {/* THREADS LIST */}
        <div className="space-y-3">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-stone-400">Loading master tailoring discussions...</p>
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="py-16 text-center space-y-4 bg-stone-900/60 border border-stone-800 rounded-3xl p-8">
              <Scissors className="w-10 h-10 text-stone-600 mx-auto" />
              <h4 className="text-base font-bold text-white">No discussions match your filter</h4>
              <p className="text-xs text-stone-400 max-w-sm mx-auto">
                Try clearing your search query or start a new thread to ask fellow Nigerian artisans for advise.
              </p>
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedType('all');
                  setSearchQuery('');
                  setOnlySolved(false);
                }}
                className="px-4 py-2 rounded-xl bg-stone-800 text-xs font-bold text-stone-200"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            filteredThreads.map((thread) => {
              const typeMeta = getThreadTypeBadge(thread.thread_type);
              const catMeta = getCategoryMeta(thread.category);

              return (
                <div
                  key={thread.id}
                  onClick={() => handleOpenThread(thread)}
                  className="bg-stone-900 border border-stone-800 hover:border-amber-500/40 rounded-3xl p-5 shadow-lg transition-all hover:bg-stone-900/90 cursor-pointer group space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {thread.is_pinned && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border border-amber-500/30">
                          <Pin className="w-3 h-3" />
                          <span>Pinned</span>
                        </span>
                      )}
                      {thread.is_solved && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Solved</span>
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 text-[10px] font-bold">
                        {catMeta.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${typeMeta.bg}`}>
                        {typeMeta.label}
                      </span>
                    </div>

                    <div className="text-[11px] text-stone-400 font-mono flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(thread.created_at)}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-white group-hover:text-amber-300 transition-colors leading-snug">
                    {thread.title}
                  </h3>

                  <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed">
                    {thread.content}
                  </p>

                  {/* Thread Footer Info */}
                  <div className="pt-2 border-t border-stone-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-stone-800 text-amber-400 font-black flex items-center justify-center text-[10px]">
                        {thread.author_name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-bold text-stone-200">{thread.author_name}</span>
                      {thread.author_verified && (
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      {thread.author_state && (
                        <span className="text-stone-400 text-[11px] flex items-center gap-0.5">
                          <MapPin className="w-3 h-3 text-stone-500" />
                          {thread.author_state}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-stone-400 text-[11px] font-mono">
                      <span className="flex items-center gap-1 hover:text-amber-300 transition-colors">
                        <ThumbsUp className="w-3.5 h-3.5 text-amber-400" />
                        <span>{thread.upvotes_count || 0}</span>
                      </span>

                      <span className="flex items-center gap-1 hover:text-white transition-colors">
                        <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                        <span>{thread.replies_count || 0} replies</span>
                      </span>

                      <span className="flex items-center gap-1 text-stone-500">
                        <Eye className="w-3.5 h-3.5" />
                        <span>{thread.views_count || 0}</span>
                      </span>
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>

      </main>

      {/* CREATE NEW THREAD MODAL */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-4 border-b border-stone-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Scissors className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Ask Tailoring Advice or Start Topic</h3>
                  <p className="text-xs text-stone-400">Published to all master tailors across Nigeria</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateThread} className="space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1.5">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as ForumCategory)}
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  {FORUM_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label} — {cat.description.slice(0, 50)}...
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1.5">
                  Topic Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'advice_needed', label: 'Need Advice' },
                    { id: 'pro_tip', label: 'Pro Tip' },
                    { id: 'showcase', label: 'Fit Check' },
                    { id: 'discussion', label: 'Discussion' },
                  ].map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => setNewType(t.id as any)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                        newType === t.id
                          ? 'bg-amber-500 text-stone-950 font-black border-amber-400'
                          : 'bg-stone-950 text-stone-400 border-stone-800 hover:text-white'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1.5">
                  Discussion Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. How to prevent Senator collar bubbling after heavy starching?"
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white placeholder:text-stone-600 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1.5">
                  Details / Craft Question
                </label>
                <textarea
                  rows={5}
                  required
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Describe your tailoring challenge, machine specs, fabric type, or formula in detail so artisans can provide exact solutions..."
                  className="w-full p-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white placeholder:text-stone-600 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1.5">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="e.g. Senator, Collar, Balogun, Interlining, Jack F4"
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white placeholder:text-stone-600 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1.5">
                  Optional Reference Image / Fit Photo URL
                </label>
                <input
                  type="url"
                  value={newMediaUrl}
                  onChange={(e) => setNewMediaUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white placeholder:text-stone-600 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="pt-4 border-t border-stone-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 text-xs font-bold text-stone-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingThread}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingThread ? 'Publishing...' : 'Publish to Guild'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
