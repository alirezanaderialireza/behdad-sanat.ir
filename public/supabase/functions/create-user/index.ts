import { serve } from "http/server";
import { createClient } from "@supabase/supabase-js";

// Headers برای جلوگیری از خطای CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // پاسخ به درخواست preflight برای CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ۱. دریافت اطلاعات کاربر جدید از بدنه درخواست
    const { newUser } = await req.json();
    const { email, password, fullName, username, role } = newUser;

    // ۲. ایجاد یک کلاینت ادمین برای ساخت کاربر جدید
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      // *** تغییر در این خط: نام متغیر اصلاح شد ***
      Deno.env.get('SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // ۳. ایجاد کاربر در بخش Authentication
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
    });

    if (authError) throw authError;

    const newUserId = authData.user.id;

    // ۴. ایجاد پروفایل برای کاربر جدید در جدول profiles
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUserId,
        full_name: fullName,
        username: username,
        role: role,
        email: email
      });

    if (profileError) throw profileError;

    // ۵. ارسال پاسخ موفقیت‌آمیز
    return new Response(JSON.stringify({ message: `کاربر ${fullName} با موفقیت ایجاد شد.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    // بررسی نوع خطا برای دسترسی امن به پیام
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    
    // ارسال پاسخ خطا
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

