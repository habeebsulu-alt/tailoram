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
        { error: 'Missing required parameters (recipient "to", subject, or html).' },
        { status: 400 }
      );
    }

    const host = (settings?.smtp_host || process.env.SMTP_HOST || 'mail.spacemail.com').trim();
    const port = Number(settings?.smtp_port || process.env.SMTP_PORT || 465);
    const user = (settings?.smtp_user || settings?.sender_email || process.env.SMTP_USER || fromEmail || '').trim();
    const pass = (settings?.smtp_pass || settings?.api_key || process.env.SMTP_PASS || '').trim();
    const secure = port === 465;

    if (!user) {
      return NextResponse.json(
        { error: 'Spacemail Mailbox Username is empty. Please enter your full email address (e.g. notifications@yourdomain.com).' },
        { status: 400 }
      );
    }

    if (!pass) {
      return NextResponse.json(
        { error: 'Spacemail Mailbox Password is empty. Please enter your mailbox password.' },
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
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
      tls: {
        rejectUnauthorized: false,
      },
    });

    // Verify SMTP connection and credentials before attempting to send
    try {
      await transporter.verify();
    } catch (verifyError: any) {
      console.error('SMTP Connection / Auth Verification Error:', verifyError);
      let errorMsg = verifyError?.message || 'SMTP Authentication failed.';
      if (errorMsg.includes('Invalid login') || errorMsg.includes('535') || errorMsg.includes('authentication')) {
        errorMsg = 'Incorrect Spacemail username or password. Please verify your mailbox password in Spaceship Launchpad.';
      } else if (errorMsg.includes('ETIMEDOUT') || errorMsg.includes('ECONNREFUSED')) {
        errorMsg = `Could not connect to SMTP server ${host}:${port}. If using port 465, try port 587, or verify internet/firewall settings.`;
      }
      return NextResponse.json({ error: errorMsg }, { status: 401 });
    }

    // In Spacemail, the from header MUST match the authenticated mailbox address
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
    console.error('SMTP send-email fatal error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to dispatch email via Spacemail SMTP' },
      { status: 500 }
    );
  }
}

