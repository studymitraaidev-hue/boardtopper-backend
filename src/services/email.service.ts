import config from '../config/env';

// Resend API — https://resend.com (free tier: 3,000 emails/month)
// Uses native fetch (Node 18+) — no npm package needed.

const RESEND_API_KEY = config.RESEND_API_KEY;
const FROM_EMAIL     = config.FROM_EMAIL;
const APP_URL        = config.APP_URL;

interface SendResult {
  ok: boolean;
  id?: string;
  error?: string;
}

async function sendEmail(to: string, subject: string, html: string): Promise<SendResult> {
  if (!RESEND_API_KEY) {
    // Gracefully skip in dev if key not set — never crash the main flow
    console.warn('[Email] RESEND_API_KEY not set — email skipped:', subject);
    return { ok: true };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('[Email] Resend error:', res.status, body);
      return { ok: false, error: body };
    }

    const data = (await res.json()) as { id: string };
    return { ok: true, id: data.id };
  } catch (err) {
    console.error('[Email] Network error:', err);
    return { ok: false, error: String(err) };
  }
}

// ── Email templates ──────────────────────────────────────────────────────────

export async function sendWelcomeEmail(
  to: string,
  name: string
): Promise<void> {
  const firstName = name.split(' ')[0] ?? name;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
    <!-- Header -->
    <div style="background:#2563eb;padding:32px 40px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:900;letter-spacing:-0.5px;">
        🎓 BoardTopper<span style="color:#bfdbfe;">AI</span>
      </h1>
      <p style="margin:8px 0 0;color:#bfdbfe;font-size:13px;font-weight:600;">Maharashtra SSC Class 10 · AI Study Partner</p>
    </div>
    <!-- Body -->
    <div style="padding:36px 40px;">
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;font-weight:800;">Welcome aboard, ${firstName}! 🚀</h2>
      <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">
        Your AI study partner is ready. Here's what you can do right now:
      </p>
      <div style="background:#f1f5f9;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
        <div style="margin-bottom:14px;display:flex;align-items:flex-start;gap:12px;">
          <span style="font-size:18px;">🤖</span>
          <div>
            <p style="margin:0 0 2px;color:#0f172a;font-size:14px;font-weight:700;">AI Doubt Solver</p>
            <p style="margin:0;color:#64748b;font-size:13px;">Ask any SSC question — get board-style answers instantly</p>
          </div>
        </div>
        <div style="margin-bottom:14px;display:flex;align-items:flex-start;gap:12px;">
          <span style="font-size:18px;">📚</span>
          <div>
            <p style="margin:0 0 2px;color:#0f172a;font-size:14px;font-weight:700;">Smart Notes</p>
            <p style="margin:0;color:#64748b;font-size:13px;">Chapter notes with board tips and past year questions</p>
          </div>
        </div>
        <div style="display:flex;align-items:flex-start;gap:12px;">
          <span style="font-size:18px;">🏆</span>
          <div>
            <p style="margin:0 0 2px;color:#0f172a;font-size:14px;font-weight:700;">Progress Tracker</p>
            <p style="margin:0;color:#64748b;font-size:13px;">Track your streak and see which subjects need work</p>
          </div>
        </div>
      </div>
      <a href="${APP_URL}/dashboard" style="display:block;background:#2563eb;color:#ffffff;text-align:center;padding:14px 24px;border-radius:12px;text-decoration:none;font-weight:800;font-size:15px;">
        Start Studying Now →
      </a>
      <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;text-align:center;">
        You're on the <strong>Free plan</strong>. 
        <a href="${APP_URL}/pricing" style="color:#2563eb;text-decoration:none;">Upgrade to Pro</a> for unlimited AI doubts.
      </p>
    </div>
    <!-- Footer -->
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 40px;text-align:center;">
      <p style="margin:0;color:#94a3b8;font-size:11px;">
        BoardTopperAI · Maharashtra SSC Exam Preparation<br>
        <a href="${APP_URL}/privacy" style="color:#94a3b8;">Privacy Policy</a> · 
        <a href="${APP_URL}/terms" style="color:#94a3b8;">Terms of Service</a>
      </p>
    </div>
  </div>
</body>
</html>`;

  await sendEmail(to, '🎓 Welcome to BoardTopperAI — Your AI Study Partner is Ready!', html);
}

export async function sendLoginNotificationEmail(
  to: string,
  name: string,
  loginTime: Date
): Promise<void> {
  const firstName = name.split(' ')[0] ?? name;
  const timeStr = loginTime.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:#0f172a;padding:24px 40px;display:flex;align-items:center;gap:12px;">
      <span style="font-size:20px;">🔐</span>
      <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:800;">New Login Detected</h1>
    </div>
    <div style="padding:32px 40px;">
      <p style="margin:0 0 16px;color:#475569;font-size:15px;">Hi <strong style="color:#0f172a;">${firstName}</strong>,</p>
      <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">
        A new login to your BoardTopperAI account was detected.
      </p>
      <div style="background:#f1f5f9;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 8px;color:#64748b;font-size:13px;font-weight:600;">LOGIN DETAILS</p>
        <p style="margin:0 0 4px;color:#0f172a;font-size:14px;"><strong>Time:</strong> ${timeStr} IST</p>
        <p style="margin:0;color:#0f172a;font-size:14px;"><strong>Account:</strong> ${to}</p>
      </div>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:14px 18px;margin-bottom:24px;">
        <p style="margin:0;color:#dc2626;font-size:13px;font-weight:600;">
          ⚠️ If this wasn't you, 
          <a href="${APP_URL}/forgot-password" style="color:#dc2626;">reset your password immediately</a>.
        </p>
      </div>
      <a href="${APP_URL}/dashboard" style="display:block;background:#2563eb;color:#ffffff;text-align:center;padding:14px 24px;border-radius:12px;text-decoration:none;font-weight:800;font-size:15px;">
        Go to Dashboard →
      </a>
    </div>
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 40px;text-align:center;">
      <p style="margin:0;color:#94a3b8;font-size:11px;">BoardTopperAI · This is an automated security email.</p>
    </div>
  </div>
</body>
</html>`;

  await sendEmail(to, '🔐 New Login to Your BoardTopperAI Account', html);
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetToken: string
): Promise<void> {
  const firstName = name.split(' ')[0] ?? name;
  const resetUrl  = `${APP_URL}/reset-password?token=${resetToken}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:#2563eb;padding:28px 40px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:900;">🎓 BoardTopper<span style="color:#bfdbfe;">AI</span></h1>
    </div>
    <div style="padding:36px 40px;">
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;font-weight:800;">Reset Your Password</h2>
      <p style="margin:0 0 8px;color:#475569;font-size:15px;">Hi <strong>${firstName}</strong>,</p>
      <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
        We received a request to reset your password. Click the button below — this link expires in <strong>30 minutes</strong>.
      </p>
      <a href="${resetUrl}" style="display:block;background:#2563eb;color:#ffffff;text-align:center;padding:16px 24px;border-radius:12px;text-decoration:none;font-weight:800;font-size:15px;margin-bottom:24px;">
        Reset My Password →
      </a>
      <div style="background:#f1f5f9;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
        <p style="margin:0 0 6px;color:#64748b;font-size:12px;font-weight:700;">LINK NOT WORKING?</p>
        <p style="margin:0;color:#64748b;font-size:12px;word-break:break-all;">${resetUrl}</p>
      </div>
      <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6;">
        If you didn't request this, ignore this email — your password will remain unchanged.
      </p>
    </div>
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 40px;text-align:center;">
      <p style="margin:0;color:#94a3b8;font-size:11px;">BoardTopperAI · This link expires in 30 minutes.</p>
    </div>
  </div>
</body>
</html>`;

  await sendEmail(to, '🔑 Reset Your BoardTopperAI Password', html);
}

export async function sendCancellationEmail(
  to: string,
  name: string,
  endsAt: Date,
  plan: 'monthly' | 'yearly'
): Promise<SendResult> {
  const firstName   = name.split(' ')[0] ?? name;
  const endsAtStr   = endsAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const planLabel   = plan === 'yearly' ? 'Yearly Plan' : 'Monthly Plan';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
    <!-- Header -->
    <div style="background:#2563eb;padding:32px 40px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:900;letter-spacing:-0.5px;">
        🎓 BoardTopper<span style="color:#bfdbfe;">AI</span>
      </h1>
      <p style="margin:8px 0 0;color:#bfdbfe;font-size:13px;font-weight:600;">Maharashtra SSC Class 10 · AI Study Partner</p>
    </div>
    <!-- Body -->
    <div style="padding:36px 40px;">
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;font-weight:800;">Subscription Cancelled</h2>
      <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">
        Hi ${firstName},
      </p>
      <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">
        Your subscription cancellation has been processed.
      </p>
      <div style="background:#f1f5f9;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
        <p style="margin:0 0 8px;color:#64748b;font-size:13px;font-weight:600;">SUBSCRIPTION DETAILS</p>
        <p style="margin:0 0 4px;color:#0f172a;font-size:14px;"><strong>Plan:</strong> ${planLabel}</p>
        <p style="margin:0;color:#0f172a;font-size:14px;"><strong>Access ends:</strong> ${endsAtStr}</p>
      </div>
      <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">
        You will continue to have full Pro access until <strong>${endsAtStr}</strong>. After that your account will move to the free plan automatically.
      </p>
      <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6;">
        If you change your mind before ${endsAtStr}, contact <a href="mailto:billing@boardtopper.ai" style="color:#2563eb;text-decoration:none;">billing@boardtopper.ai</a>.
      </p>
      <a href="${APP_URL}/dashboard" style="display:block;background:#2563eb;color:#ffffff;text-align:center;padding:14px 24px;border-radius:12px;text-decoration:none;font-weight:800;font-size:15px;">
        Go to Dashboard →
      </a>
    </div>
    <!-- Footer -->
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 40px;text-align:center;">
      <p style="margin:0;color:#94a3b8;font-size:11px;">
        The BoardTopper Team<br>
        <a href="${APP_URL}/privacy" style="color:#94a3b8;">Privacy Policy</a> ·
        <a href="${APP_URL}/terms" style="color:#94a3b8;">Terms of Service</a>
      </p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail(to, 'Your BoardTopper Pro subscription has been cancelled', html);
}

export async function sendVerificationEmail(
  to: string,
  name: string,
  verifyUrl: string
): Promise<void> {
  const firstName = name.split(' ')[0] ?? name;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
    <!-- Header -->
    <div style="background:#2563eb;padding:32px 40px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:900;letter-spacing:-0.5px;">
        🎓 BoardTopper<span style="color:#bfdbfe;">AI</span>
      </h1>
      <p style="margin:8px 0 0;color:#bfdbfe;font-size:13px;font-weight:600;">Maharashtra SSC Class 10 · AI Study Partner</p>
    </div>
    <!-- Body -->
    <div style="padding:36px 40px;">
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;font-weight:800;">Verify your email address</h2>
      <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">Hi <strong>${firstName}</strong>,</p>
      <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
        Thank you for signing up! Please verify your email address to activate your account.
      </p>
      <a href="${verifyUrl}" style="display:block;background:#2563eb;color:#ffffff;text-align:center;padding:16px 24px;border-radius:12px;text-decoration:none;font-weight:800;font-size:15px;margin-bottom:24px;">
        Verify Email Address →
      </a>
      <p style="margin:0 0 12px;color:#94a3b8;font-size:13px;">This link expires in <strong>24 hours</strong>.</p>
      <p style="margin:0;color:#94a3b8;font-size:13px;">If you did not sign up for BoardTopper, ignore this email.</p>
    </div>
    <!-- Footer -->
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 40px;text-align:center;">
      <p style="margin:0;color:#94a3b8;font-size:11px;">
        The BoardTopper Team<br>
        <a href="${APP_URL}/privacy" style="color:#94a3b8;">Privacy Policy</a> ·
        <a href="${APP_URL}/terms" style="color:#94a3b8;">Terms of Service</a>
      </p>
    </div>
  </div>
</body>
</html>`;

  await sendEmail(to, 'Verify your BoardTopper email address', html);
}

export async function sendResendVerificationEmail(
  to: string,
  name: string,
  verifyUrl: string
): Promise<void> {
  const firstName = name.split(' ')[0] ?? name;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
    <!-- Header -->
    <div style="background:#2563eb;padding:32px 40px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:900;letter-spacing:-0.5px;">
        🎓 BoardTopper<span style="color:#bfdbfe;">AI</span>
      </h1>
      <p style="margin:8px 0 0;color:#bfdbfe;font-size:13px;font-weight:600;">Maharashtra SSC Class 10 · AI Study Partner</p>
    </div>
    <!-- Body -->
    <div style="padding:36px 40px;">
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;font-weight:800;">Your new verification link</h2>
      <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">Hi <strong>${firstName}</strong>,</p>
      <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
        Here is a new email verification link.
      </p>
      <a href="${verifyUrl}" style="display:block;background:#2563eb;color:#ffffff;text-align:center;padding:16px 24px;border-radius:12px;text-decoration:none;font-weight:800;font-size:15px;margin-bottom:24px;">
        Verify Email Address →
      </a>
      <p style="margin:0 0 12px;color:#94a3b8;font-size:13px;">This link expires in <strong>24 hours</strong>.</p>
      <p style="margin:0;color:#94a3b8;font-size:13px;">If you did not sign up for BoardTopper, ignore this email.</p>
    </div>
    <!-- Footer -->
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 40px;text-align:center;">
      <p style="margin:0;color:#94a3b8;font-size:11px;">
        The BoardTopper Team<br>
        <a href="${APP_URL}/privacy" style="color:#94a3b8;">Privacy Policy</a> ·
        <a href="${APP_URL}/terms" style="color:#94a3b8;">Terms of Service</a>
      </p>
    </div>
  </div>
</body>
</html>`;

  await sendEmail(to, 'Your new BoardTopper verification link', html);
}

// DAY 39: Account deletion confirmation — DPDP compliance
export async function sendAccountDeletionEmail(
  to: string,
  name: string,
  scheduledDeletionDate: Date
): Promise<void> {
  const firstName   = name.split(' ')[0] ?? name;
  const deletionStr = scheduledDeletionDate.toLocaleDateString('en-IN', {
    day:   'numeric',
    month: 'long',
    year:  'numeric',
  });

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
    <!-- Header -->
    <div style="background:#dc2626;padding:28px 40px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:900;">Account Deletion Requested</h1>
      <p style="margin:8px 0 0;color:#fecaca;font-size:13px;">BoardTopperAI</p>
    </div>
    <!-- Body -->
    <div style="padding:36px 40px;">
      <p style="margin:0 0 16px;color:#475569;font-size:15px;">Hi <strong style="color:#0f172a;">${firstName}</strong>,</p>
      <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">
        Your BoardTopper account has been scheduled for permanent deletion on
        <strong style="color:#0f172a;">${deletionStr}</strong>.
      </p>
      <!-- Cooling-off notice -->
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:18px 20px;margin-bottom:24px;">
        <p style="margin:0 0 8px;color:#991b1b;font-size:13px;font-weight:700;">⏱ 7-Day Cooling-Off Period</p>
        <p style="margin:0;color:#b91c1c;font-size:13px;line-height:1.6;">
          Changed your mind? Email us at
          <a href="mailto:support@boardtopper.ai" style="color:#dc2626;font-weight:700;">support@boardtopper.ai</a>
          before <strong>${deletionStr}</strong> to cancel this request.
        </p>
      </div>
      <!-- What gets deleted -->
      <div style="background:#f1f5f9;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
        <p style="margin:0 0 12px;color:#475569;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">What Will Be Deleted</p>
        <ul style="margin:0;padding:0;list-style:none;space-y:8px;">
          <li style="display:flex;align-items:center;gap:8px;margin-bottom:8px;color:#475569;font-size:13px;">
            <span style="color:#dc2626;">✕</span> All your notes and AI-generated content
          </li>
          <li style="display:flex;align-items:center;gap:8px;margin-bottom:8px;color:#475569;font-size:13px;">
            <span style="color:#dc2626;">✕</span> Your study progress and streak history
          </li>
          <li style="display:flex;align-items:center;gap:8px;margin-bottom:8px;color:#475569;font-size:13px;">
            <span style="color:#dc2626;">✕</span> All doubt conversations
          </li>
          <li style="display:flex;align-items:center;gap:8px;color:#475569;font-size:13px;">
            <span style="color:#dc2626;">✕</span> Quiz attempts and results
          </li>
        </ul>
      </div>
      <!-- Financial data notice -->
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 18px;margin-bottom:24px;">
        <p style="margin:0;color:#166534;font-size:13px;line-height:1.6;">
          <strong>ℹ Payment records</strong> are anonymised (not deleted) as required by applicable law.
          No personally identifiable information is retained in payment records.
        </p>
      </div>
      <a href="${APP_URL}/dashboard" style="display:block;background:#0f172a;color:#ffffff;text-align:center;padding:14px 24px;border-radius:12px;text-decoration:none;font-weight:800;font-size:15px;">
        Go to Dashboard →
      </a>
    </div>
    <!-- Footer -->
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 40px;text-align:center;">
      <p style="margin:0;color:#94a3b8;font-size:11px;">
        BoardTopperAI · Maharashtra SSC Exam Preparation<br>
        <a href="${APP_URL}/privacy" style="color:#94a3b8;">Privacy Policy</a> ·
        <a href="mailto:support@boardtopper.ai" style="color:#94a3b8;">support@boardtopper.ai</a>
      </p>
    </div>
  </div>
</body>
</html>`;

  await sendEmail(to, 'Your BoardTopper account has been scheduled for deletion', html);
}
