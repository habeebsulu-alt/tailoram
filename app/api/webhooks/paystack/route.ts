import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';
import { recordWalletTransaction } from '@/lib/paystack';
import { WalletTransaction } from '@/lib/types';
import { saveLocalRequestOverride } from '@/lib/payments';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const paystackSignature = req.headers.get('x-paystack-signature');
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    // Verify HMAC signature if secret key is configured and not in test/stub mode
    if (secretKey && !secretKey.includes('placeholder') && paystackSignature) {
      const hash = crypto.createHmac('sha512', secretKey).update(rawBody).digest('hex');
      if (hash !== paystackSignature) {
        return NextResponse.json({ error: 'Invalid Paystack webhook signature' }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody || '{}');
    const event = payload?.event;
    const data = payload?.data;

    if (!data) {
      return NextResponse.json({ received: true, note: 'Empty webhook payload' });
    }

    const reference = data.reference;
    const metadata = data.metadata || {};
    const orderId = metadata.order_id || metadata.request_id;
    const designerId = metadata.designer_id;
    const clientId = metadata.client_id;
    const paymentStage = metadata.stage || metadata.type || 'deposit';
    const grossAmount = (data.amount || 0) / 100; // kobo to NGN
    const commissionRate = metadata.commission_rate || 10;
    const platformCommission = Math.round(grossAmount * (commissionRate / 100));
    const designerNet = grossAmount - platformCommission;

    if (event === 'charge.success') {
      const now = new Date().toISOString();

      // 1. Create or update transaction record in ledger
      const walletTxn: WalletTransaction = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        order_id: orderId || `order_${reference}`,
        client_id: clientId || 'client',
        designer_id: designerId || 'designer',
        gross_amount: grossAmount,
        commission_rate: commissionRate,
        platform_commission_amount: platformCommission,
        designer_net_amount: designerNet,
        payment_stage: paymentStage === 'deposit' ? 'deposit' : 'balance',
        status: 'pending', // Pending settlement to designer's bank account
        paystack_reference: reference,
        receipt_url: `https://checkout.paystack.com/receipt/${reference}`,
        client_name: metadata.client_name || data.customer?.first_name || 'Client',
        style_description: metadata.style_description,
        metadata: {
          gateway: 'paystack',
          paystack_id: data.id,
          paid_at: data.paid_at || now,
          channel: data.channel,
          subaccount: data.subaccount?.subaccount_code,
        },
        created_at: now,
      };

      await recordWalletTransaction(walletTxn);

      // 2. Synchronize request status
      if (orderId) {
        const nextStatus = paymentStage === 'deposit' ? 'deposit_paid' : 'completed';
        const requestUpdates = paymentStage === 'deposit'
          ? { status: 'deposit_paid' as const, deposit_amount: grossAmount, deposit_paid_at: now }
          : { status: 'completed' as const, balance_amount: grossAmount, balance_paid_at: now };

        await saveLocalRequestOverride(orderId, requestUpdates);

        try {
          await supabase.from('requests').update(requestUpdates).eq('id', orderId);
        } catch (dbErr) {
          console.warn('Webhook requests table update notice:', dbErr);
        }
      }
    } else if (event === 'transfer.success' || event === 'settlement.success') {
      // Mark matching transactions as settled to bank
      const now = new Date().toISOString();
      try {
        if (reference) {
          await supabase
            .from('transactions')
            .update({ status: 'settled', settled_at: now })
            .eq('paystack_reference', reference);
        }
      } catch (settleErr) {
        console.warn('Settlement update notice:', settleErr);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Paystack webhook error:', err);
    return NextResponse.json({ error: err.message || 'Webhook processing error' }, { status: 500 });
  }
}
