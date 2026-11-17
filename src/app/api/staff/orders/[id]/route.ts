import { requireStaff } from '@/lib/auth/requireStaff';
import { createServiceClient } from '@/lib/supabase/server';
import type { StaffAction } from '@/lib/types';

const ACTIONS: StaffAction[] = ['complete', 'deliver', 'revert', 'cancel'];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireStaff(request);
  if (denied) return denied;

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { action?: unknown } | null;
  const action = body?.action;
  if (typeof action !== 'string' || !ACTIONS.includes(action as StaffAction)) {
    return Response.json({ error: 'invalid_action' }, { status: 400 });
  }

  const { data, error } = await createServiceClient().rpc('staff_update_order', { p_id: id, p_action: action });
  if (error) {
    if (error.message?.includes('invalid_transition')) {
      return Response.json({ error: 'invalid_transition' }, { status: 409 });
    }
    return Response.json({ error: 'server_error' }, { status: 500 });
  }
  return Response.json({ status: data });
}
