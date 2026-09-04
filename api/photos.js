// /api/photos — fotoğraf listele / ekle / sil / başlık güncelle (Vercel + Vercel Blob)
// Model: her fotoğraf kendi blob dosyasıdır. Liste, dosyalardan üretilir.
// Yol: ph/<section>/<id>~<base64url(caption)>.<ext>  (üzerine yazma yok → kayıp yok)
import { put, del, list, copy } from '@vercel/blob';
import { isAuthed, readBody } from '../lib/auth.js';

const ROOT = 'ph/';
const SECTIONS = ['hero', 'galeri'];
const ALLOWED = { 'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp', 'image/gif':'gif' };
const MAX_BYTES = 8 * 1024 * 1024;
const SEP = '~'; // base64url'de bulunmayan, URL-güvenli ayraç

function sec(s){ return s === 'hero' ? 'hero' : 'galeri'; }
function uid(){ return 'p' + Date.now() + Math.random().toString(36).slice(2, 8); }
function encCap(s){ return Buffer.from(String(s || ''), 'utf8').toString('base64url'); }
function decCap(s){ try { return Buffer.from(String(s || ''), 'base64url').toString('utf8'); } catch { return ''; } }

// pathname -> { id, caption, ext }
function parseName(pathname){
  const file = pathname.split('/').pop() || '';
  const dot = file.lastIndexOf('.');
  const ext = dot >= 0 ? file.slice(dot + 1) : '';
  const base = dot >= 0 ? file.slice(0, dot) : file;
  const i = base.indexOf(SEP);
  const id = i >= 0 ? base.slice(0, i) : base;
  const caption = i >= 0 ? decCap(base.slice(i + 1)) : '';
  return { id, caption, ext };
}

async function listSection(section){
  const items = [];
  let cursor;
  do {
    const res = await list({ prefix: ROOT + section + '/', cursor, limit: 1000 });
    for (const b of res.blobs){
      const { id, caption } = parseName(b.pathname);
      if (!id) continue;
      items.push({ id, src: b.url, pathname: b.pathname, caption: caption || 'Fotoğraf', _t: b.uploadedAt });
    }
    cursor = res.hasMore ? res.cursor : undefined;
  } while (cursor);
  items.sort((a, b) => new Date(a._t) - new Date(b._t)); // eski→yeni
  return items.map(({ _t, ...rest }) => rest);
}

async function findBlob(section, id){
  const res = await list({ prefix: ROOT + section + '/' + id + SEP, limit: 1 });
  return res.blobs[0] || null;
}

export default async function handler(req, res){
  if (req.method === 'GET'){
    try{
      const [hero, galeri] = await Promise.all([listSection('hero'), listSection('galeri')]);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ ok: true, photos: { hero, galeri } });
    }catch(e){
      return res.status(200).json({ ok: true, photos: { hero: [], galeri: [] } });
    }
  }
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Desteklenmeyen istek' });
  if (!isAuthed(req)) return res.status(401).json({ ok: false, error: 'Yetkisiz. Lütfen giriş yapın.' });

  const b = await readBody(req);
  const action = b.action || '';
  const section = sec(b.section);

  try{
    if (action === 'add'){
      const m = /^data:([^;]+);base64,(.+)$/s.exec(b.dataUrl || '');
      if (!m) return res.status(400).json({ ok: false, error: 'Geçersiz resim verisi.' });
      const mime = m[1].toLowerCase();
      const ext = ALLOWED[mime];
      if (!ext) return res.status(400).json({ ok: false, error: 'Sadece JPG, PNG, WEBP, GIF yükleyebilirsiniz.' });
      const buf = Buffer.from(m[2], 'base64');
      if (buf.length > MAX_BYTES) return res.status(400).json({ ok: false, error: 'Dosya çok büyük.' });

      const id = uid();
      const caption = (b.caption || '').toString().trim().slice(0, 120) || 'Fotoğraf';
      const pathname = `${ROOT}${section}/${id}${SEP}${encCap(caption)}.${ext}`;
      const { url } = await put(pathname, buf, { access: 'public', contentType: mime, addRandomSuffix: false });
      return res.status(200).json({ ok: true, item: { id, src: url, pathname, caption } });
    }

    if (action === 'delete'){
      const id = String(b.id || '');
      const blob = await findBlob(section, id);
      if (blob) await del(blob.url);
      return res.status(200).json({ ok: true });
    }

    if (action === 'update'){
      const id = String(b.id || '');
      const caption = (b.caption || '').toString().trim().slice(0, 120) || 'Fotoğraf';
      const blob = await findBlob(section, id);
      if (!blob) return res.status(404).json({ ok: false, error: 'Fotoğraf bulunamadı.' });
      const { ext } = parseName(blob.pathname);
      const newPath = `${ROOT}${section}/${id}${SEP}${encCap(caption)}.${ext}`;
      if (newPath !== blob.pathname){
        await copy(blob.url, newPath, { access: 'public' });
        await del(blob.url);
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ ok: false, error: 'Bilinmeyen işlem.' });
  }catch(e){
    return res.status(500).json({ ok: false, error: 'Sunucu hatası: ' + (e && e.message || e) });
  }
}
