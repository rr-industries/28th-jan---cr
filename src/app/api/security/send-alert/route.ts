import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase-admin';

const resendAPIKey = process.env.RESEND_API_KEY;
const resend = resendAPIKey ? new Resend(resendAPIKey) : null;

export async function POST(req: NextRequest) {
    try {
        const { sessionId, userId, riskLevel, geoData, ip, reason } = await req.json();

        // 1. Log alert to security_alerts table
        const { data: alert, error: alertError } = await supabaseAdmin
            .from('security_alerts')
            .insert({
                session_id: sessionId,
                user_id: userId,
                alert_type: reason || 'high_risk_login',
                severity: riskLevel === 'high' ? 'high' : 'medium',
                metadata: {
                    geo: geoData,
                    ip,
                    user_agent: req.headers.get('user-agent')
                }
            })
            .select()
            .single();

        if (alertError) throw alertError;

        // 2. Perform Real-time Notification if high risk
        if (resend && (riskLevel === 'high' || reason === 'impossible_travel')) {
            const { data: admins } = await supabaseAdmin
                .from('employees')
                .select('email, name')
                .or('role.eq.Super Admin,role.eq.super_admin');

            const emails = (admins || [])
                .map(a => (a as any).email)
                .filter(Boolean);

            if (emails.length > 0) {
                try {
                    await resend.emails.send({
                        from: 'Security <security@mg.caferepublic.internal>',
                        to: emails as string[],
                        subject: `🚨 Security Alert: ${reason?.toUpperCase().replace('_', ' ') || 'High Risk Login'}`,
                        html: `
                            <div style="font-family: sans-serif; padding: 24px; color: #1f2937;">
                                <h1 style="color: #dc2626; font-size: 24px;">Suspicious Login Detected</h1>
                                <p>A high-risk login event was recorded for User ID: <strong>${userId.substring(0, 8)}...</strong></p>
                                <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 20px 0;">
                                    <p><strong>Reason:</strong> ${reason || 'Anomalous behavior'}</p>
                                    <p><strong>Location:</strong> ${geoData.city}, ${geoData.country}</p>
                                    <p><strong>ISP:</strong> ${geoData.isp}</p>
                                    <p><strong>IP Address:</strong> ${ip}</p>
                                </div>
                                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/security" 
                                   style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
                                   Open Security Center
                                </a>
                            </div>
                        `
                    });
                } catch (emailErr) {
                    console.error("Email dispatch failed:", emailErr);
                }
            }
        }

        return NextResponse.json({ success: true, alertId: alert.id });

    } catch (error: any) {
        console.error("Critical Alert System Failure:", error);
        return NextResponse.json({ error: "Alert logging failed" }, { status: 500 });
    }
}
