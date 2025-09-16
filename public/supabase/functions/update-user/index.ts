import { serve } from "server";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, updates } = await req.json();
    const { fullName, role, password } = updates;

    if (!userId) {
      throw new Error("User ID is required for an update.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Update profile in the profiles table
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ full_name: fullName, role: role })
      .eq('id', userId);

    if (profileError) throw profileError;

    // If a new password is provided, update it in the auth system
    if (password && password.length >= 6) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: password }
      );
      if (authError) throw authError;
    }

    return new Response(JSON.stringify({ message: "کاربر با موفقیت به‌روز شد." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    // Correctly handle the unknown error type
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

