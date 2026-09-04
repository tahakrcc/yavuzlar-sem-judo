// /api/photos — fotoğraf listele / ekle / sil / başlık güncelle (Vercel + Vercel Blob)
import { put, del, list } from '@vercel/blob';
import { isAuthed, readBody } from '../lib/auth.js';

const META = 'photos-meta.json';      // sabit yol → tek kayıt, silme yok
const IMG_PREFIX  = 'img/';           // görsel blob'ları
const ALLOWED = { 'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp', 'image/gif':'gif' };
const MAX_BYTES = 8 * 1024 * 1024;    // güvenli üst sınır

function empty(){ return { hero: [], galeri: [] }; }

async function readMeta(){
  try{
    const { blobs } = await list({ prefix: META, limit: 1 });
    if (!blobs.length) return empty();
    // önbelleği aşmak için sorgu ekiyle taze oku
    const r = await fetch(blobs[0].url + '?_=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return empty();
    const d = await r.json();
    return { hero: d.hero || [], galeri: d.galeri || [] };
  }catch(e){ return empty(); }
}

async function writeMeta(data){
  // sabit yol + üzerine yaz; silme/rastgele sonek yok (yarış/önbellek sorunlarını önler)
  await put(META, JSON.stringify(data), {
    access: 'public', contentType: 'application/json',
    addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 0
  });
}

function uid(){ return 'p' + Date.now() + Math.random().toString(36).slice(2, 8); }

export default async function handler(req, res){
  // Listeleme herkese açık
  if (req.method === 'GET'){
    const data = await readMeta();
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true, photos: data });
  }
  if (req.method !== 'POST'){
    return res.status(405).json({ ok: false, error: 'Desteklenmeyen istek' });
  }

  // Yazma işlemleri yönetici gerektirir
  if (!isAuthed(req)){
    return res.status(401).json({ ok: false, error: 'Yetkisiz. Lütfen giriş yapın.' });
  }

  const b = await readBody(req);
  const action = b.action || '';
  const section = b.section === 'hero' ? 'hero' : 'galeri';
  const data = await readMeta();

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
      const { url, pathname } = await put(`${IMG_PREFIX}${id}.${ext}`, buf, {
        access: 'public', contentType: mime, addRandomSuffix: false
      });
      const caption = (b.caption || '').toString().trim().slice(0, 120) || 'Fotoğraf';
      const item = { id, src: url, pathname, caption };
      data[section].push(item);
      await writeMeta(data);
      return res.status(200).json({ ok: true, item });
    }

    if (action === 'delete'){
      const id = String(b.id || '');
      const found = data[section].find(p => p.id === id);
      data[section] = data[section].filter(p => p.id !== id);
      await writeMeta(data);
      if (found){ try{ await del(found.pathname || found.src); }catch(e){} }
      return res.status(200).json({ ok: true });
    }

    if (action === 'update'){
      const id = String(b.id || '');
      const cap = (b.caption || '').toString().trim().slice(0, 120) || 'Fotoğraf';
      const it = data[section].find(p => p.id === id);
      if (!it) return res.status(404).json({ ok: false, error: 'Fotoğraf bulunamadı.' });
      it.caption = cap;
      await writeMeta(data);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ ok: false, error: 'Bilinmeyen işlem.' });
  }catch(e){
    return res.status(500).json({ ok: false, error: 'Sunucu hatası: ' + (e && e.message || e) });
  }
}
