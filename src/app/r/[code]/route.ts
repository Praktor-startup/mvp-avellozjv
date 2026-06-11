import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Redirect de rastreamento: /r/<code> registra o scan da origem (anônimo) e
// encaminha para a landing /loja?o=<code>. Usado nos QR codes físicos.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { db: { schema: 'avelloz' } },
    )
    await supabase.rpc('track_scan', {
      p_code: code,
      p_ua: request.headers.get('user-agent') ?? null,
      p_ref: request.headers.get('referer') ?? null,
    })
  } catch {
    // não bloqueia o redirect se o tracking falhar
  }

  const url = new URL('/loja', request.url)
  url.searchParams.set('o', code)
  return NextResponse.redirect(url)
}
