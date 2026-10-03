import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      to,
      subject,
      html,
      fromName = 'Tailoram Nigeria',
      fromEmail,
      settings,
    } = body;

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Missing required fields (to, subject, html)' },
        { status: 400 }
      );
    }

    const host = settings?.smtp_host || process.env.SMTP_HOST || 'mail.spacemail.com';
    const port = Number(settings?.smtp_port || process.env.SMTP_PORT || 465);
    const user = settings?.smtp_user || settings?.sender_email || process.env.SMTP_USER || fromEmail;
    const pass = settings?.smtp_pass || settings?.api_key || process.env.SMTP_PASS;
    const secure = port === 465;

    if (!user || !pass) {
      return NextResponse.json(
        { error: 'SMTP Username and Password are required. Please check your Spacemail credentials.' },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure, // true for 465, false for 587
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const senderDisplay = fromName ? `"${fromName}" <${user}>` : user;

    const info = await transporter.sendMail({
      from: senderDisplay,
      to,
      subject,
      html,
    });

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      accepted: info.accepted,
    });
  } catch (error: any) {
    console.error('SMTP send-email error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to dispatch email via SMTP' },
      { status: 500 }
    );
  }
}
