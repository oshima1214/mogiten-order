import { requireStaff } from '@/lib/auth/requireStaff';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireStaff(request);
  if (denied) return denied;

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { isSoldOut?: unknown } | null;
  if (typeof body?.isSoldOut !== 'boolean') return Response.json({ error: 'invalid_body' }, { status: 400 });

  const { error } = await createServiceClient().from('menu_items').update({ is_sold_out: body.isSoldOut }).eq('id', id);
  if (error) return Response.json({ error: 'server_error' }, { status: 500 });
  return new Response(null, { status: 204 });
}
