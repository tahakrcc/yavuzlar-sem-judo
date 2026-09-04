// /api/auth — giriş / çıkış / durum (Vercel serverless)
import { checkCreds, makeToken, isAuthed, cookieHeader, readBody, MAX_AGE_S } from '../lib/auth.js';

export default async function handler(req, res){
  const action = (req.query && req.query.action) || '';

  if (action === 'status'){
    return res.status(200).json({ ok: true, loggedIn: isAuthed(req) });
  }

  if (action === 'logout'){
    res.setHeader('Set-Cookie', cookieHeader('', 0, req));
    return res.status(200).json({ ok: true });
  }

  if (action === 'login'){
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST gerekli' });
    const b = await readBody(req);
    if (checkCreds(b.user, b.pass)){
      res.setHeader('Set-Cookie', cookieHeader(makeToken(), MAX_AGE_S, req));
      return res.status(200).json({ ok: true });
    }
    await new Promise(r => setTimeout(r, 400)); // basit yavaşlatma
    return res.status(401).json({ ok: false, error: 'Kullanıcı adı veya şifre hatalı.' });
  }

  return res.status(400).json({ ok: false, error: 'Geçersiz işlem' });
}
