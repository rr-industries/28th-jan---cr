import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
    try {
        const { identifier, password, deviceInfo } = await req.json();

        let finalEmail = identifier.trim();
        if (!finalEmail.includes('@')) {
            finalEmail = `${finalEmail.toLowerCase()}@caferepublic.internal`;
        }

        // 1. Authenticate via Supabase Admin (to manage sessions manually if needed)
        const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
            email: finalEmail,
            password: password.trim()
        });

        if (authError || !authData.user) {
            return NextResponse.json({ error: authError?.message || "Invalid credentials" }, { status: 401 });
        }

        // 2. Extra Security: Check if employee is active & Linked
        let { data: empData, error: empError } = await supabaseAdmin
            .from('employees')
            .select('id, is_active, role, email')
            .eq('auth_user_id', authData.user.id)
            .maybeSingle();

        // Auto-link by email if not linked yet
        if (!empData && !empError) {
            console.log("Attempting auto-link for email:", authData.user.email);
            const { data: linkData, error: linkError } = await supabaseAdmin
                .from('employees')
                .select('id, is_active, role, email')
                .eq('email', authData.user.email)
                .maybeSingle();

            if (linkData) {
                await supabaseAdmin
                    .from('employees')
                    .update({ auth_user_id: authData.user.id })
                    .eq('id', linkData.id);
                empData = linkData;
            }
        }

        if (empError || !empData || !empData.is_active) {
            console.log("Auth block: Employee not found or inactive", { empData, empError });
            await supabaseAdmin.auth.admin.signOut(authData.session?.access_token || '');
            return NextResponse.json({ error: "Account deactivated or not found" }, { status: 403 });
        }

        // 3. Get IP and Geo-IP Data
        const forwarded = req.headers.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0] : (req as any).ip || '127.0.0.1';

        let geoData = {
            country: 'Localhost',
            city: 'Development',
            region: 'System',
            latitude: 21.1458,
            longitude: 79.0882,
            isp: 'Internal'
        };

        // Fetch Geo-Data (ipapi.co)
        if (ip !== '127.0.0.1' && !ip.startsWith('192.168.')) {
            try {
                const geoRes = await fetch(`https://ipapi.co/${ip}/json/`);
                const data = await geoRes.json();
                if (!data.error) {
                    geoData = {
                        country: data.country_name,
                        city: data.city,
                        region: data.region,
                        latitude: data.latitude,
                        longitude: data.longitude,
                        isp: data.org
                    };
                }
            } catch (err) {
                console.error("Geo-IP fetch error:", err);
            }
        }

        // 4. Advanced Risk Analysis (Impossible Travel & New Country)
        let riskLevel = 'low';
        let riskReason = '';

        const { data: lastSession } = await supabaseAdmin
            .from('auth_sessions')
            .select('country, city, latitude, longitude, login_at')
            .eq('user_id', authData.user.id)
            .order('login_at', { ascending: false })
            .limit(1);

        if (lastSession && lastSession.length > 0) {
            const last = lastSession[0];

            // 4a. New Country Check
            if (last.country !== geoData.country) {
                riskLevel = 'high';
                riskReason = 'new_country';
            }
            // 4b. Impossible Travel Check
            else if (last.latitude && last.longitude && geoData.latitude && geoData.longitude) {
                const R = 6371; // Earth radius in km
                const dLat = (geoData.latitude - (last.latitude as any)) * Math.PI / 180;
                const dLon = (geoData.longitude - (last.longitude as any)) * Math.PI / 180;
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos((last.latitude as any) * Math.PI / 180) * Math.cos(geoData.latitude * Math.PI / 180) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const distance = R * c; // Distance in km

                const timeDiffHours = (new Date().getTime() - new Date(last.login_at).getTime()) / (1000 * 60 * 60);

                // If travel speed > 900 km/h (speed of commercial jet), flag as impossible
                if (timeDiffHours > 0 && (distance / timeDiffHours) > 900) {
                    riskLevel = 'high';
                    riskReason = 'impossible_travel';
                }
            }
        }

        // 5. Store Session
        const { data: sessionData, error: sessionError } = await supabaseAdmin
            .from('auth_sessions')
            .insert({
                user_id: authData.user.id,
                ip_address: ip,
                device_info: deviceInfo || 'Unknown Device',
                status: 'active',
                login_at: new Date().toISOString(),
                country: geoData.country,
                region: geoData.region,
                city: geoData.city,
                latitude: geoData.latitude,
                longitude: geoData.longitude,
                isp: geoData.isp,
                risk_level: riskLevel
            })
            .select()
            .single();

        if (sessionError) throw sessionError;

        // 6. Trigger Security Alert if needed
        if (riskLevel === 'high') {
            try {
                // Internal fetch to our alert API
                await fetch(`${req.nextUrl.origin}/api/security/send-alert`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId: sessionData.id,
                        userId: authData.user.id,
                        riskLevel,
                        geoData,
                        ip,
                        reason: riskReason
                    })
                });
            } catch (alertErr) {
                console.error("Self-alert trigger failed:", alertErr);
            }
        }

        // 7. Return standard auth data
        return NextResponse.json({
            user: authData.user,
            session: authData.session,
            role: empData.role
        });

    } catch (error: any) {
        console.error("Login API Crisis:", error);
        return NextResponse.json({ error: "Authentication system error" }, { status: 500 });
    }
}
