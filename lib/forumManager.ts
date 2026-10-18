import { supabase } from './supabase';
import { ForumThread, ForumReply, ForumCategory, ForumThreadType } from './types';

export const LOCAL_STORAGE_FORUM_KEY = 'tailoram_forum_threads';

export const INITIAL_SEED_THREADS: ForumThread[] = [
  {
    id: 'thread-senator-collar-bubbling',
    title: 'How do you permanently prevent Senator collars from bubbling after dry cleaning or heavy starching?',
    category: 'troubleshooting',
    thread_type: 'advice_needed',
    tags: ['Senator', 'Interlining', 'Pressing', 'Troubleshooting'],
    content: `Fellow master tailors, I need advise on collar stay selection.\n\nTwo of my high-profile clients in Victoria Island brought back their 2-piece Senator sets. After roadside dry-cleaning and commercial hot pressing, the mandarin collar developed tiny bubbles and wrinkles where the interlining separated from the fabric.\n\nI was using the standard white non-woven gumstay from Balogun market. What specific woven fusing canvas or haircloth do you recommend, and what iron temperature/damp pressing method guarantees a permanent fuse that won't delaminate even under heavy laundry starch?`,
    author_id: '11111111-1111-1111-1111-111111111101',
    author_name: 'Dele Balogun',
    author_role: 'designer',
    author_studio: 'Dele Couture & Heritage',
    author_state: 'Lagos',
    author_verified: true,
    views_count: 342,
    upvotes_count: 28,
    replies_count: 3,
    is_solved: true,
    is_pinned: true,
    created_at: '2026-10-15T11:20:00Z',
    replies: [
      {
        id: 'reply-collar-1',
        thread_id: 'thread-senator-collar-bubbling',
        author_id: '11111111-1111-1111-1111-111111111103',
        author_name: 'Emeka Nwosu',
        author_role: 'designer',
        author_studio: 'Emeka Bespoke Craft',
        author_state: 'Rivers',
        author_verified: true,
        content: `Master Dele, the root cause is the resin coating on non-woven interlining. Most market gumstay melts at too low a temperature and degrades once laundry solvent touches it.\n\nHere is our studio protocol in Port Harcourt:\n1. Switch strictly to **German Woven Fusible Collar Canvas** (ask Balogun dealers for "Super-Stay Woven" or "Freudenberg Woven 220g").\n2. Cut the stay on the **bias (45-degree angle)** for the outer collar curve so it rolls cleanly around the neck.\n3. When fusing, do not glide the iron. **Press down firmly for 12 to 14 seconds** at 150°C using a damp organza or muslin pressing cloth.\n4. Let the collar cool flat on the table for 15 minutes before sewing so the polyamide glue cures completely.\n\nSince we adopted this 2 years ago, zero client bubbling complaints!`,
        helpful_count: 24,
        is_solution: true,
        created_at: '2026-10-15T13:45:00Z',
      },
      {
        id: 'reply-collar-2',
        thread_id: 'thread-senator-collar-bubbling',
        author_id: '11111111-1111-1111-1111-111111111105',
        author_name: 'Zainab Al-Hassan',
        author_role: 'designer',
        author_studio: 'Zainab Kaftan Studio',
        author_state: 'Kano',
        author_verified: true,
        content: `Spot on, Brother Emeka. Also add topstitch edge support: run a subtle 1mm edge stitch along the upper collar border. Even if dry cleaners use harsh steam, that topstitch physically anchors the fabric layers together.`,
        helpful_count: 14,
        is_solution: false,
        created_at: '2026-10-15T15:10:00Z',
      },
      {
        id: 'reply-collar-3',
        thread_id: 'thread-senator-collar-bubbling',
        author_id: '11111111-1111-1111-1111-111111111104',
        author_name: 'Yewande Adire Studio',
        author_role: 'designer',
        author_studio: 'Yewande Adire Couture',
        author_state: 'Oyo',
        author_verified: true,
        content: `If you have an industrial vacuum suction ironing board, suck the heat out right after pressing. It instantly sets the bond before the glue can loosen.`,
        helpful_count: 9,
        is_solution: false,
        created_at: '2026-10-15T18:30:00Z',
      },
    ],
  },
  {
    id: 'thread-agbada-shoulder-drop',
    title: 'Agbada Shoulder Balance: Exact cutting formula to stop the neck from pulling backwards when walking',
    category: 'pattern_drafting',
    thread_type: 'pro_tip',
    tags: ['Agbada', 'Pattern Drafting', 'Neckline', 'Brocade'],
    content: `When drafting grand 3-piece Agbada on heavy 100% Guinea Brocade (Shadda) or heavy Aso-Oke, many young tailors struggle with the robe shifting backwards as the client walks, causing the front neck hole to choke the wearer.\n\nHere is the golden formula we use in Northern Nigeria:\n\n1. **Shoulder Slope Differential**: Back shoulder line must be 1.25 inches HIGHER than the front shoulder line.\n2. **Front Neckline Drop**: Front neck depth should be 4 inches; Back neck depth must not exceed 1.25 inches.\n3. **Embroidery Weight Compensation**: Because the chest embroidery (Agbada chest flap) weighs between 300g to 600g depending on metallic thread density, you MUST add a 0.5-inch forward pitch to the shoulder seam. This counterbalances the gravity of the embroidery and ensures the Agbada sits flush on the collarbones without riding up.\n\nTry this on your next Senator-Agbada commission and check the drape!`,
    author_id: '11111111-1111-1111-1111-111111111105',
    author_name: 'Zainab Al-Hassan',
    author_role: 'designer',
    author_studio: 'Zainab Kaftan Studio',
    author_state: 'Kano',
    author_verified: true,
    views_count: 518,
    upvotes_count: 42,
    replies_count: 2,
    is_solved: true,
    is_pinned: true,
    created_at: '2026-10-16T09:15:00Z',
    replies: [
      {
        id: 'reply-agbada-1',
        thread_id: 'thread-agbada-shoulder-drop',
        author_id: '11111111-1111-1111-1111-111111111101',
        author_name: 'Dele Balogun',
        author_role: 'designer',
        author_studio: 'Dele Couture & Heritage',
        author_state: 'Lagos',
        author_verified: true,
        content: `Masterclass advice, Hajiya Zainab! That 0.5-inch forward pitch is the exact secret old master tailors in Lagos Island kept guarded. Heavy monogram/cornely embroidery always drags backward if the shoulder is cut symmetrical. Blessings for sharing freely with the guild!`,
        helpful_count: 18,
        is_solution: true,
        created_at: '2026-10-16T10:40:00Z',
      },
      {
        id: 'reply-agbada-2',
        thread_id: 'thread-agbada-shoulder-drop',
        author_id: '22222222-2222-2222-2222-222222222201',
        author_name: 'Tunde Balogun',
        author_role: 'client',
        author_state: 'Lagos',
        content: `As a client who attends 2-3 Owambes monthly, I can confirm this! When an Agbada isn't cut this way, you spend the entire party pulling the front forward. Designers, please master this!`,
        helpful_count: 11,
        is_solution: false,
        created_at: '2026-10-16T14:20:00Z',
      },
    ],
  },
  {
    id: 'thread-cashmere-market-prices-2026',
    title: 'Balogun & Kantin Kwari Wholesale Survey: Current prices for original 7-Star Cashmere vs Poly-Wool',
    category: 'fabric_sourcing',
    thread_type: 'discussion',
    tags: ['Balogun', 'Kantin Kwari', 'Fabric Prices', 'Cashmere', 'Senator'],
    content: `Colleagues, sharing our wholesale market survey from this week across Balogun Market (Lagos) and Kantin Kwari (Kano) so tailors don't get shortchanged or underquote clients for end-of-year bespoke contracts:\n\n• **Italian / English 7-Star Cashmere (Original 150s Wool)**:\n  - Balogun Wholesale (Docemo/Martins St): ₦38,000 – ₦45,000 per yard\n  - Kano Kantin Kwari: ₦35,000 – ₦40,000 per yard\n\n• **Super 120s Senator Wool/Polyester Blend (Good daily wear)**:\n  - Balogun: ₦14,000 – ₦18,000 per yard\n  - Aba (Ariaria): ₦12,500 – ₦15,000 per yard\n\n• **Swiss Voile Lace (Original Getzner / Filtex)**:\n  - 5 yards bundle: ₦95,000 – ₦160,000 depending on stone density\n\n• **Pure Cotton Adire Eleko / Oniko (Hand-dyed 5 yards)**:\n  - Itoku Market (Abeokuta direct): ₦22,000 – ₦28,000\n\nAre you seeing any price relief from your suppliers, or are you passing the inflation surcharge directly into your bespoke sewing quotes?`,
    author_id: '11111111-1111-1111-1111-111111111103',
    author_name: 'Emeka Nwosu',
    author_role: 'designer',
    author_studio: 'Emeka Bespoke Craft',
    author_state: 'Rivers',
    author_verified: true,
    views_count: 420,
    upvotes_count: 36,
    replies_count: 2,
    is_solved: false,
    created_at: '2026-10-16T16:00:00Z',
    replies: [
      {
        id: 'reply-prices-1',
        thread_id: 'thread-cashmere-market-prices-2026',
        author_id: '11111111-1111-1111-1111-111111111102',
        author_name: 'Maryam Bello',
        author_role: 'designer',
        author_studio: 'Maryam Bello Atelier',
        author_state: 'Abuja',
        author_verified: true,
        content: `In Wuse 2 and Garki (Abuja), suppliers are quoting ₦50,000/yard for original 150s cashmere! We now advise clients who want custom fabric sourcing to approve fabric cost with immediate payment upfront before we make the run, because prices change weekly.`,
        helpful_count: 15,
        is_solution: false,
        created_at: '2026-10-16T17:30:00Z',
      },
      {
        id: 'reply-prices-2',
        thread_id: 'thread-cashmere-market-prices-2026',
        author_id: '11111111-1111-1111-1111-111111111104',
        author_name: 'Yewande Adire Studio',
        author_role: 'designer',
        author_studio: 'Yewande Adire Couture',
        author_state: 'Oyo',
        author_verified: true,
        content: `For Adire, Itoku Market and Oje Market in Ibadan remain the best direct source. If buying 20+ bundles, you can negotiate down to ₦20,000 per 5 yards with color-fastness guarantee.`,
        helpful_count: 12,
        is_solution: false,
        created_at: '2026-10-16T19:00:00Z',
      },
    ],
  },
  {
    id: 'thread-jack-f4-vs-juki-inverter',
    title: 'Jack F4 Direct-Drive vs Juki DDL-8700 on 1.5kVA Solar Inverter: Power draw & thick fabric test',
    category: 'machines_equipment',
    thread_type: 'pro_tip',
    tags: ['Jack F4', 'Juki', 'Solar Inverter', 'Studio Equipment', 'Power'],
    content: `With petrol prices high, running generators 8 hours daily in our studios is cutting deep into tailoring margins. We ran a side-by-side power benchmark between our older clutch motor machines, the Jack F4 Direct-Drive, and the Juki DDL-8700 with an external servo motor.\n\n**Test Results on a 24V 1.5kVA Inverter with 2x 200Ah Tubular Batteries**:\n\n1. **Jack F4 (Built-in Servo Motor)**:\n   - Idle wattage: Just 4 Watts!\n   - Sewing speed (3,000 RPM on 4 layers of Cashmere): 110 – 140 Watts.\n   - Needle-up/needle-down positioning works flawlessly with zero battery spike.\n   - Runtime: Can run 2 Jack F4 machines for 10+ hours on solar batteries without touching generator!\n\n2. **Older Clutch Motor Machine**:\n   - Idle wattage: 280 Watts continuously even when not pressing the foot pedal!\n   - Tripped our inverter immediately on startup surge.\n\n**Verdict**: If you're still using old clutch motor heads, replacing the motor with a ₦45,000 direct servo or buying a Jack F4 pays for itself in fuel savings within 3 months.`,
    author_id: '11111111-1111-1111-1111-111111111104',
    author_name: 'Yewande Adire Studio',
    author_role: 'designer',
    author_studio: 'Yewande Adire Couture',
    author_state: 'Oyo',
    author_verified: true,
    views_count: 610,
    upvotes_count: 53,
    replies_count: 1,
    is_solved: true,
    is_pinned: false,
    created_at: '2026-10-17T08:00:00Z',
    replies: [
      {
        id: 'reply-power-1',
        thread_id: 'thread-jack-f4-vs-juki-inverter',
        author_id: '11111111-1111-1111-1111-111111111103',
        author_name: 'Emeka Nwosu',
        author_role: 'designer',
        author_studio: 'Emeka Bespoke Craft',
        author_state: 'Rivers',
        author_verified: true,
        content: `Can confirm 100%! We switched our 4 workshop tables to Jack F4 and Jack A2B lockstitch machines. We only turn on the Mikano generator when powering the heavy industrial steam boiler iron. Our monthly diesel budget dropped by 65%.`,
        helpful_count: 22,
        is_solution: true,
        created_at: '2026-10-17T09:40:00Z',
      },
    ],
  },
  {
    id: 'thread-emergency-owambe-pricing',
    title: 'What formula do you use for Emergency 48-Hour Owambe orders without burning out your workshop?',
    category: 'pricing_business',
    thread_type: 'discussion',
    tags: ['Pricing', 'Business', 'Emergency Order', 'Owambe', 'Turnaround'],
    content: `Colleagues, we all know the Nigerian client who calls on Wednesday afternoon: *"My tailor disappointed me, and the wedding is on Saturday morning in Abuja! Can you make 2 full Senator sets and an Agbada by Friday night?"*\n\nPreviously we accepted these out of goodwill and ended up sleeping in the shop while paying tailors overtime with almost zero profit left.\n\nHow do you structure your express surcharge?\n- Flat 50% extra?\n- 100% rush multiplier?\n- Mandatory 100% upfront deposit before scissors touch fabric?\n\nLet's discuss workshop sustainability and pricing discipline!`,
    author_id: '11111111-1111-1111-1111-111111111102',
    author_name: 'Maryam Bello',
    author_role: 'designer',
    author_studio: 'Maryam Bello Atelier',
    author_state: 'Abuja',
    author_verified: true,
    views_count: 388,
    upvotes_count: 31,
    replies_count: 2,
    is_solved: true,
    created_at: '2026-10-17T12:00:00Z',
    replies: [
      {
        id: 'reply-pricing-1',
        thread_id: 'thread-emergency-owambe-pricing',
        author_id: '11111111-1111-1111-1111-111111111101',
        author_name: 'Dele Balogun',
        author_role: 'designer',
        author_studio: 'Dele Couture & Heritage',
        author_state: 'Lagos',
        author_verified: true,
        content: `Madam Maryam, here is our ironclad policy in Surulere:\n\n1. **Standard Lead Time**: 7 to 10 days.\n2. **Express (under 72 hours)**: **+60% rush surcharge**.\n3. **Emergency Flash (under 48 hours)**: **+100% rush multiplier** (Double the base sewing charge).\n4. **Payment**: 100% full payment upfront before cutting. No 40% deposit for rush orders.\n5. Half of that surcharge goes directly as a cash overtime bonus to the specific cutter and stitcher on that garment.\n\nWhen clients realize emergency delivery costs double, two things happen: the unserious ones back off, and the serious ones pay happily without arguing because you're saving their weekend reputation!`,
        helpful_count: 27,
        is_solution: true,
        created_at: '2026-10-17T13:15:00Z',
      },
      {
        id: 'reply-pricing-2',
        thread_id: 'thread-emergency-owambe-pricing',
        author_id: '11111111-1111-1111-1111-111111111106',
        author_name: 'Chidinma Okafor',
        author_role: 'designer',
        author_studio: 'Chidinma Bridal Glam',
        author_state: 'Enugu',
        author_verified: true,
        content: `Sharing the rush fee with your workers is the game-changer! When my apprentices hear there's a ₦15,000 night shift bonus attached, they sew with intense focus and joy instead of grumbling.`,
        helpful_count: 19,
        is_solution: false,
        created_at: '2026-10-17T15:20:00Z',
      },
    ],
  },
  {
    id: 'thread-corset-boning-fit-check',
    title: 'Fit Check: 8-Panel Corset Ball Gown in Emerald Duchess Satin & French Beaded Lace',
    category: 'showcase_critique',
    thread_type: 'showcase',
    tags: ['Fit Check', 'Corset', 'Bridal', 'Boning', 'Duchess Satin'],
    content: `Artisans, please critique this 8-panel sheer illusion corset gown we just finalized for a traditional bride in Enugu.\n\nWe utilized:\n- Double synthetic whalebone channels along the princess seams\n- Spiral steel boning around the center bust cups for structured lift\n- Hand-beaded French lace appliqués draped over emerald Duchess satin\n- Internal waist stay band to reduce tension on the back zipper\n\nAny thoughts on the breast cup curvature before the client arrives for final fitting tomorrow?`,
    author_id: '11111111-1111-1111-1111-111111111106',
    author_name: 'Chidinma Okafor',
    author_role: 'designer',
    author_studio: 'Chidinma Bridal Glam',
    author_state: 'Enugu',
    author_verified: true,
    media_url: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&w=1000&q=80',
    media_type: 'image',
    views_count: 470,
    upvotes_count: 45,
    replies_count: 1,
    is_solved: true,
    created_at: '2026-10-17T18:00:00Z',
    replies: [
      {
        id: 'reply-corset-1',
        thread_id: 'thread-corset-boning-fit-check',
        author_id: '11111111-1111-1111-1111-111111111102',
        author_name: 'Maryam Bello',
        author_role: 'designer',
        author_studio: 'Maryam Bello Atelier',
        author_state: 'Abuja',
        author_verified: true,
        content: `Exquisite work, sister Chidinma! The transition from the sheer illusion to the satin skirt is seamless. The waist stay band was a genius move — that guarantees the zipper won't burst when she sits down during the wedding reception. 10/10 master craft!`,
        helpful_count: 16,
        is_solution: true,
        created_at: '2026-10-17T19:30:00Z',
      },
    ],
  },
];

/**
 * Fetch all forum threads, merging cloud platform_settings with local fallback
 */
export async function fetchForumThreads(): Promise<ForumThread[]> {
  let localThreads: ForumThread[] = [];

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_FORUM_KEY);
      if (stored) {
        localThreads = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Error reading local forum threads:', e);
    }
  }

  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'forum_threads')
      .maybeSingle();

    if (!error && data?.value && Array.isArray(data.value) && data.value.length > 0) {
      const merged = mergeThreads(data.value, localThreads);
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_FORUM_KEY, JSON.stringify(merged));
      }
      return merged;
    }
  } catch (err) {
    console.warn('Supabase forum fetch notice:', err);
  }

  // If both empty, seed defaults
  if (localThreads.length === 0) {
    localThreads = INITIAL_SEED_THREADS;
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_FORUM_KEY, JSON.stringify(INITIAL_SEED_THREADS));
    }
    // Attempt background persistence to platform_settings
    try {
      await supabase.from('platform_settings').upsert({
        key: 'forum_threads',
        value: INITIAL_SEED_THREADS,
      });
    } catch {}
  }

  return localThreads;
}

/**
 * Fetch a single forum thread by ID
 */
export async function fetchForumThreadById(id: string): Promise<ForumThread | null> {
  const threads = await fetchForumThreads();
  return threads.find((t) => t.id === id) || null;
}

/**
 * Create a new forum thread
 */
export async function createForumThread(params: {
  title: string;
  category: ForumCategory;
  thread_type: ForumThreadType;
  tags: string[];
  content: string;
  author_id: string;
  author_name: string;
  author_role: 'designer' | 'client' | 'admin';
  author_studio?: string;
  author_state?: string;
  author_verified?: boolean;
  media_url?: string;
  media_type?: 'image' | 'video';
}): Promise<ForumThread> {
  const threads = await fetchForumThreads();

  const newThread: ForumThread = {
    ...params,
    id: `thread-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    views_count: 1,
    upvotes_count: 1,
    replies_count: 0,
    is_solved: false,
    is_pinned: false,
    created_at: new Date().toISOString(),
    replies: [],
  };

  const updatedThreads = [newThread, ...threads];
  await persistForumThreads(updatedThreads);
  return newThread;
}

/**
 * Add a reply to a thread
 */
export async function addForumReply(
  threadId: string,
  replyParams: {
    author_id: string;
    author_name: string;
    author_role: 'designer' | 'client' | 'admin';
    author_studio?: string;
    author_state?: string;
    author_verified?: boolean;
    content: string;
  }
): Promise<ForumReply | null> {
  const threads = await fetchForumThreads();
  const threadIndex = threads.findIndex((t) => t.id === threadId);

  if (threadIndex === -1) return null;

  const newReply: ForumReply = {
    ...replyParams,
    id: `reply-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    thread_id: threadId,
    helpful_count: 0,
    is_solution: false,
    created_at: new Date().toISOString(),
  };

  const targetThread = threads[threadIndex];
  const existingReplies = targetThread.replies || [];
  const updatedReplies = [...existingReplies, newReply];

  threads[threadIndex] = {
    ...targetThread,
    replies: updatedReplies,
    replies_count: updatedReplies.length,
    updated_at: new Date().toISOString(),
  };

  await persistForumThreads(threads);
  return newReply;
}

/**
 * Toggle upvote on thread
 */
export async function toggleUpvoteThread(threadId: string): Promise<number> {
  const threads = await fetchForumThreads();
  const thread = threads.find((t) => t.id === threadId);
  if (!thread) return 0;

  const hasUpvoted = typeof window !== 'undefined'
    ? localStorage.getItem(`tailoram_upvoted_${threadId}`) === 'true'
    : false;

  const delta = hasUpvoted ? -1 : 1;
  thread.upvotes_count = Math.max(0, (thread.upvotes_count || 0) + delta);

  if (typeof window !== 'undefined') {
    if (hasUpvoted) {
      localStorage.removeItem(`tailoram_upvoted_${threadId}`);
    } else {
      localStorage.setItem(`tailoram_upvoted_${threadId}`, 'true');
    }
  }

  await persistForumThreads(threads);
  return thread.upvotes_count;
}

/**
 * Toggle helpful mark on reply
 */
export async function toggleHelpfulReply(threadId: string, replyId: string): Promise<number> {
  const threads = await fetchForumThreads();
  const thread = threads.find((t) => t.id === threadId);
  if (!thread || !thread.replies) return 0;

  const reply = thread.replies.find((r) => r.id === replyId);
  if (!reply) return 0;

  const storageKey = `tailoram_helpful_${replyId}`;
  const hasVoted = typeof window !== 'undefined'
    ? localStorage.getItem(storageKey) === 'true'
    : false;

  const delta = hasVoted ? -1 : 1;
  reply.helpful_count = Math.max(0, (reply.helpful_count || 0) + delta);

  if (typeof window !== 'undefined') {
    if (hasVoted) {
      localStorage.removeItem(storageKey);
    } else {
      localStorage.setItem(storageKey, 'true');
    }
  }

  await persistForumThreads(threads);
  return reply.helpful_count;
}

/**
 * Toggle mark a reply as solution
 */
export async function toggleMarkSolution(threadId: string, replyId: string): Promise<boolean> {
  const threads = await fetchForumThreads();
  const thread = threads.find((t) => t.id === threadId);
  if (!thread || !thread.replies) return false;

  const reply = thread.replies.find((r) => r.id === replyId);
  if (!reply) return false;

  const newStatus = !reply.is_solution;
  // If setting as solution, unmark any previous solution
  thread.replies.forEach((r) => {
    r.is_solution = r.id === replyId ? newStatus : false;
  });

  thread.is_solved = newStatus;
  await persistForumThreads(threads);
  return newStatus;
}

/**
 * Delete a forum thread (Admin / Author action)
 */
export async function deleteForumThread(threadId: string): Promise<boolean> {
  const threads = await fetchForumThreads();
  const updated = threads.filter((t) => t.id !== threadId);
  await persistForumThreads(updated);
  return true;
}

/**
 * Increment thread view count
 */
export async function incrementThreadView(threadId: string): Promise<void> {
  const threads = await fetchForumThreads();
  const thread = threads.find((t) => t.id === threadId);
  if (!thread) return;

  thread.views_count = (thread.views_count || 0) + 1;
  await persistForumThreads(threads);
}

// Helpers
function mergeThreads(cloud: ForumThread[], local: ForumThread[]): ForumThread[] {
  const map = new Map<string, ForumThread>();
  INITIAL_SEED_THREADS.forEach((t) => map.set(t.id, t));
  cloud.forEach((t) => map.set(t.id, t));
  local.forEach((t) => map.set(t.id, t));
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

async function persistForumThreads(threads: ForumThread[]): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_FORUM_KEY, JSON.stringify(threads));
    } catch {}
  }

  try {
    await supabase.from('platform_settings').upsert({
      key: 'forum_threads',
      value: threads,
    });
  } catch (err) {
    console.warn('Failed to sync forum threads to platform_settings:', err);
  }
}
