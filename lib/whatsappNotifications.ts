/**
 * Tailoram Smart WhatsApp Dispatch Engine (Zero-Cost / wa.me Deep Links)
 *
 * Enables 1-click WhatsApp notification dispatch across key bespoke fashion milestones:
 * 1. New Custom Commission Order (Client -> Designer)
 * 2. Official Studio Quote & Timeline (Designer -> Client)
 * 3. 40% Commitment Deposit Paid (Client -> Designer)
 * 4. Tailoring Finished & 60% Balance Due (Designer -> Client)
 * 5. 100% Commission Settlement (Client -> Designer)
 * 6. Quick Chat Consultation Check-in
 */

import { normalizePhoneForWhatsApp } from './phoneUtils';
import { getAppBaseUrl } from './appUrl';

export type WhatsAppNotificationEvent =
  | 'new_request'
  | 'quote_submitted'
  | 'deposit_paid'
  | 'order_ready'
  | 'balance_paid'
  | 'chat_followup';

export interface WhatsAppNotificationPayload {
  event: WhatsAppNotificationEvent;
  recipientPhone: string | null | undefined;
  recipientName?: string;
  senderName?: string;
  styleDescription?: string;
  amount?: number;
  depositAmount?: number;
  balanceAmount?: number;
  deadline?: string | null;
  requestId: string;
}

/**
 * Builds the Nigerian couture WhatsApp message copy tailored to each workflow milestone.
 */
export function buildWhatsAppMessage(payload: WhatsAppNotificationPayload): string {
  const baseUrl = getAppBaseUrl();
  const orderLink = `${baseUrl}/messages/${payload.requestId}`;
  const sender = payload.senderName || 'Tailoram';
  const recipient = payload.recipientName || 'there';
  const style = payload.styleDescription ? `"${payload.styleDescription}"` : 'your bespoke order';

  switch (payload.event) {
    case 'new_request': {
      const budgetText = payload.amount
        ? `Budget: ₦${payload.amount.toLocaleString()}`
        : '';
      const deadlineText = payload.deadline
        ? `Needed by: ${new Date(payload.deadline).toLocaleDateString()}`
        : '';

      return (
        `👋 Hello ${recipient}!\n\n` +
        `You have received a new bespoke tailoring commission on *Tailoram* from *${sender}*.\n\n` +
        `🧵 *Attire*: ${style}\n` +
        (budgetText ? `💰 *${budgetText}*\n` : '') +
        (deadlineText ? `📅 *${deadlineText}*\n` : '') +
        `\n👉 Review the details and submit your official quote here:\n${orderLink}\n\n` +
        `_Powered by Tailoram Nigeria_`
      );
    }

    case 'quote_submitted': {
      const totalText = payload.amount ? `Total: ₦${payload.amount.toLocaleString()}` : '';
      const depText = payload.depositAmount ? `40% Commitment Deposit: ₦${payload.depositAmount.toLocaleString()}` : '';
      const deadlineText = payload.deadline
        ? `Est. Completion: ${new Date(payload.deadline).toLocaleDateString()}`
        : '';

      return (
        `📋 Hello ${recipient}!\n\n` +
        `*${sender}* has sent you an official quote for your bespoke tailoring order on *Tailoram*.\n\n` +
        `🧵 *Attire*: ${style}\n` +
        (totalText ? `💵 *${totalText}*\n` : '') +
        (depText ? `💳 *${depText}*\n` : '') +
        (deadlineText ? `⏱️ *${deadlineText}*\n` : '') +
        `\n👉 Review the quote and confirm your order here:\n${orderLink}\n\n` +
        `_Powered by Tailoram Nigeria_`
      );
    }

    case 'deposit_paid': {
      const depAmountText = payload.amount ? `₦${payload.amount.toLocaleString()}` : '40% deposit';
      return (
        `💳 Hello ${recipient}!\n\n` +
        `Great news! *${sender}* has just paid the *40% initial commitment deposit* (${depAmountText}) for ${style} on *Tailoram*.\n\n` +
        `✂️ Fabric cutting & production has officially been unlocked.\n\n` +
        `👉 View order details and start consultation here:\n${orderLink}\n\n` +
        `_Powered by Tailoram Nigeria_`
      );
    }

    case 'order_ready': {
      const balAmountText = payload.balanceAmount
        ? `₦${payload.balanceAmount.toLocaleString()}`
        : 'the remaining 60% balance';

      return (
        `✨ Hello ${recipient}!\n\n` +
        `Your bespoke outfit ${style} has been tailored and is *ready for fitting/delivery* by *${sender}*!\n\n` +
        `📦 Settle ${balAmountText} on Tailoram to arrange immediate delivery/pickup:\n${orderLink}\n\n` +
        `_Tailoram • Nigeria's Premier Bespoke Marketplace_`
      );
    }

    case 'balance_paid': {
      const balText = payload.amount ? `₦${payload.amount.toLocaleString()}` : '60% final balance';
      return (
        `🎉 Hello ${recipient}!\n\n` +
        `*${sender}* has confirmed full settlement of ${balText} for ${style} on *Tailoram*!\n\n` +
        `🚚 The commission is 100% complete and ready for final handover.\n\n` +
        `👉 View your completed order receipt:\n${orderLink}\n\n` +
        `_Tailoram Nigeria_`
      );
    }

    case 'chat_followup':
    default: {
      return (
        `💬 Hello ${recipient},\n\n` +
        `You have a new update regarding ${style} on Tailoram from *${sender}*.\n\n` +
        `👉 Open the consultation thread:\n${orderLink}\n\n` +
        `_Tailoram Nigeria_`
      );
    }
  }
}

/**
 * Generates the direct `wa.me` deep-link URL.
 * If no phone number is available, returns a `whatsapp://send` or web fallback link.
 */
export function getWhatsAppDispatchUrl(payload: WhatsAppNotificationPayload): string {
  const message = buildWhatsAppMessage(payload);
  const encoded = encodeURIComponent(message);
  const cleanPhone = normalizePhoneForWhatsApp(payload.recipientPhone);

  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encoded}`;
  }

  // Fallback if recipient phone is not on file (user can pick chat in WhatsApp)
  return `https://api.whatsapp.com/send?text=${encoded}`;
}

/**
 * Dispatches the deep-link in a new tab/window directly.
 */
export function dispatchWhatsAppNotification(payload: WhatsAppNotificationPayload): boolean {
  if (typeof window === 'undefined') return false;
  const url = getWhatsAppDispatchUrl(payload);
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}
