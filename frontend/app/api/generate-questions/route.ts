import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { getOrGenerateQuestions } from "@/app/actions/generate-questions-service";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. AUTH CHECK
    const supabase = await createClient();
    let { data: { user }, error: authError } = await supabase.auth.getUser();

    // Fallback: Se cookies falharam, tenta o header Authorization
    if (!user) {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: userFromToken, error: tokenError } = await supabase.auth.getUser(token);
        if (userFromToken.user && !tokenError) {
          user = userFromToken.user;
        }
      }
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. CALL SERVICE
    const body = await req.json();
    const result = await getOrGenerateQuestions({
      ...body,
      userId: user.id
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("API Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}