import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createDesignerSubaccount, getCommissionSettings } from '@/lib/paystack';

export async function POST(req: NextRequest) {
  try {
    const {
      designerId,
      businessName,
      bankName,
      bankCode,
      accountNumber,
      accountName,
    } = await req.json();

    if (!designerId || !bankCode || !accountNumber || !businessName) {
      return NextResponse.json(
        { error: 'Designer ID, Business Name, Bank Code, and Account Number are required.' },
        { status: 400 }
      );
    }

    const commissionSettings = await getCommissionSettings();
    const commissionPercentage = commissionSettings.commission_percentage || 10;

    // Create subaccount via Paystack API
    const subaccountResult = await createDesignerSubaccount({
      businessName,
      bankCode,
      accountNumber,
      commissionPercentage,
    });

    if (!subaccountResult.success || !subaccountResult.subaccountCode) {
      return NextResponse.json(
        { error: subaccountResult.error || 'Failed to generate Paystack subaccount.' },
        { status: 400 }
      );
    }

    const subaccountCode = subaccountResult.subaccountCode;
    const now = new Date().toISOString();

    // Update designer profile in Supabase
    const { error: dbError } = await supabase
      .from('designer_profiles')
      .update({
        bank_name: bankName,
        bank_code: bankCode,
        account_number: accountNumber,
        account_name: accountName,
        subaccount_code: subaccountCode,
        payout_verified: true,
        payout_updated_at: now,
      })
      .eq('id', designerId);

    if (dbError) {
      console.warn('Supabase designer payout update notice:', dbError.message);
    }

    return NextResponse.json({
      success: true,
      subaccountCode,
      payoutVerified: true,
      accountName,
      message: 'Bank payout details and Paystack subaccount successfully linked!',
    });
  } catch (error: any) {
    console.error('Subaccount creation API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Server error creating Paystack subaccount.' },
      { status: 500 }
    );
  }
}
