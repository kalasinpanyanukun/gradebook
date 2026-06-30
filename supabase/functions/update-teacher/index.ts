import { createClient } from 'npm:@supabase/supabase-js@2';

const AUTH_EMAIL_DOMAIN = 'ksp.gradebook';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function usernameToAuthEmail(username: string): string {
  return `${normalizeUsername(username)}@${AUTH_EMAIL_DOMAIN}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: authData, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: adminProfile, error: adminError } = await supabaseUser
      .from('profiles')
      .select('role, school_id')
      .eq('id', authData.user.id)
      .single();

    if (adminError || !['super_admin', 'admin'].includes(adminProfile?.role ?? '')) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { id, username, full_name, title, role, password, reset_password_to_username } = await req.json();
    const normalizedUsername = normalizeUsername(username ?? '');
    const newPassword = typeof password === 'string' ? password.trim() : '';

    if (!id || !normalizedUsername || !full_name) {
      return new Response(JSON.stringify({ error: 'กรอกข้อมูลไม่ครบ' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (normalizedUsername.length < 6) {
      return new Response(JSON.stringify({ error: 'Username ต้องมีอย่างน้อย 6 ตัวอักษรเพื่อใช้เป็นรหัสผ่าน' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (newPassword && newPassword.length < 6) {
      return new Response(JSON.stringify({ error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const allowedRoles = ['super_admin', 'admin', 'teacher', 'executive'];
    const requestedRole = role ?? 'teacher';
    if (!allowedRoles.includes(requestedRole)) {
      return new Response(JSON.stringify({ error: 'Invalid role' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from('profiles')
      .select('id, school_id, role')
      .eq('id', id)
      .single();

    if (targetError || !targetProfile) {
      return new Response(JSON.stringify({ error: 'ไม่พบบัญชีผู้ใช้งาน' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (targetProfile.school_id !== adminProfile.school_id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if ((targetProfile.role === 'super_admin' || requestedRole === 'super_admin') && adminProfile.role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Only Super Admin can edit Super Admin accounts' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: usernameOwner, error: usernameError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .ilike('username', normalizedUsername)
      .neq('id', id)
      .maybeSingle();

    if (usernameError) {
      return new Response(JSON.stringify({ error: usernameError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (usernameOwner) {
      return new Response(JSON.stringify({ error: 'Username นี้ถูกใช้แล้ว' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authPayload: { email: string; password?: string; email_confirm?: boolean } = {
      email: usernameToAuthEmail(normalizedUsername),
      email_confirm: true,
    };
    if (newPassword) {
      authPayload.password = newPassword;
    } else if (reset_password_to_username !== false) {
      authPayload.password = normalizedUsername;
    }

    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(id, authPayload);
    if (authUpdateError) {
      return new Response(JSON.stringify({ error: authUpdateError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({
        username: normalizedUsername,
        full_name,
        title: title ?? null,
        role: requestedRole,
      })
      .eq('id', id);

    if (profileUpdateError) {
      return new Response(JSON.stringify({ error: profileUpdateError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, id, username: normalizedUsername }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
