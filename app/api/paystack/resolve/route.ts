import { NextRequest, NextResponse } from 'next/server';
import { resolveBankAccount } from '@/lib/paystack';

export async function POST(req: NextRequest) {
  try {
    const { accountNumber, bankCode } = await req.json();

    if (!accountNumber || !bankCode) {
      return NextResponse.json(
        { error: 'Account number (10 digits) and bank code are required.' },
        { status: 400 }
      );
    }

    const result = await resolveBankAccount({ accountNumber, bankCode });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Could not resolve account name.' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      accountName: result.accountName,
    });
  } catch (error: any) {
    console.error('Account resolution API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Server error resolving bank account.' },
      { status: 500 }
    );
  }
}
