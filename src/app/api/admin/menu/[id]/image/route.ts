import { IMAGE_TYPES, validateImage } from '@/lib/admin/validate';
import { requireStaff } from '@/lib/auth/requireStaff';
import { MENU_IMAGE_BUCKET } from '@/lib/menu/imageUrl';
import { MENU_COLUMNS, mapMenuRow, type MenuRow } from '@/lib/menu/mapRow';
import { createServiceClient } from '@/lib/supabase/server';

type Ctx = { params: Promise<{ id: string }> };

async function setImage(id: string, path: string | null) {
  const sb = createServiceClient();
  const before = await sb.from('menu_items').select('image_path').eq('id', id).maybeSingle();
  if (!before.data) return Response.json({ error: 'not_found' }, { status: 404 });
  const { data, error } = await sb
    .from('menu_items')
    .update({ image_path: path })
    .eq('id', id)
    .select(MENU_COLUMNS)
    .single();
  if (error) return Response.json({ error: 'server_error' }, { status: 500 });
  if (before.data.image_path && before.data.image_path !== path) {
    await sb.storage.from(MENU_IMAGE_BUCKET).remove([before.data.image_path]);
  }
  return Response.json(mapMenuRow(data as MenuRow));
}

export async function POST(request: Request, { params }: Ctx) {
  const denied = await requireStaff(request);
  if (denied) return denied;
  const { id } = await params;

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return Response.json({ error: '画像を選んでください' }, { status: 400 });
  const invalid = validateImage(file);
  if (invalid) return Response.json({ error: invalid }, { status: 400 });

  const path = `${id}/${Date.now()}.${IMAGE_TYPES[file.type]}`;
  const upload = await createServiceClient()
    .storage.from(MENU_IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upload.error) return Response.json({ error: '画像を保存できませんでした' }, { status: 500 });
  return setImage(id, path);
}

export async function DELETE(request: Request, { params }: Ctx) {
  const denied = await requireStaff(request);
  if (denied) return denied;
  const { id } = await params;
  return setImage(id, null);
}
