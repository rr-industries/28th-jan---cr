import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
    try {
        const { sessionId } = await req.json();

        // 1. Verify Super Admin requester
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) return NextResponse.json({ error: "No token" }, { status: 401 });

        const token = authHeader.replace('Bearer ', '');
        const { data: { user: requester }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !requester) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

        const { data: empData } = await supabaseAdmin
            .from('employees')
            .select('id, role')
            .eq('auth_user_id', requester.id)
            .single();

        if (!empData || (empData.role !== 'Super Admin' && empData.role !== 'super_admin')) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // 2. Update session status
        const { error: updateError } = await supabaseAdmin
            .from('auth_sessions')
            .update({
                status: 'logged_out',
                logout_at: new Date().toISOString()
            })
            .eq('id', sessionId);

        if (updateError) throw updateError;

        // 3. Log this security action
        await supabaseAdmin.from('audit_logs').insert({
            action: 'FORCE_LOGOUT',
            target: 'auth_sessions',
            metadata: { session_id: sessionId },
            performed_by: empData.id
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Force Logout logic failure:", error);
        return NextResponse.json({ error: "Security termination failed" }, { status: 500 });
    }
}
