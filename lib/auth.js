// Yavuzlar Judo - Vercel için basit, sunucusuz kimlik doğrulama (çerez tabanlı)
import crypto from 'crypto';

// Ortam değişkeni varsa onu kullan; yoksa gömülü varsayılan (özel repo için yeterli).
const ADMIN_USER = process.env.ADMIN_USER || 'candan19';
// Parolanın SHA-256 özeti (düz metin parola burada tutulmaz).
// Değiştirmek için: node -e "console.log(require('crypto').createHash('sha256').update('YENI_PAROLA').digest('hex'))"
const ADMIN_PASS_SHA = process.env.ADMIN_PASS_SHA ||
  'dfaaee632724647103cd78df55abd85a4d76e30183ee00a9a8baa272a383394f';
// Çerez imzalama sırrı. Güvenlik için Vercel'de AUTH_SECRET ortam değişkeni tanımlayın.
const SECRET = process.env.AUTH_SECRET || ('yav-' + ADMIN_PASS_SHA);

export const COOKIE = 'yav_auth';
const MAX_AGE = 60 * 60 * 8; // 8 saat

function sha256(s){ return crypto.createHash('sha256').update(String(s)).digest('hex'); }
export function tseq(a, b){
  const A = Buffer.from(String(a)), B = Buffer.from(String(b));
  if (A.length !== B.length) return false;
  return crypto.timingSafeEqual(A, B);
}

export function checkCreds(user, pass){
  return tseq((user || '').trim(), ADMIN_USER) && tseq(sha256(pass || ''), ADMIN_PASS_SHA);
}

export function makeToken(){
  const exp = Date.now() + MAX_AGE * 1000;
  const sig = crypto.createHmac('sha256', SECRET).update(String(exp)).digest('hex');
  return `${exp}.${sig}`;
}
export function verifyToken(tok){
  if (!tok || typeof tok !== 'string') return false;
  const [exp, sig] = tok.split('.');
  if (!exp || !sig) return false;
  if (Date.now() > Number(exp)) return false;
  const good = crypto.createHmac('sha256', SECRET).update(exp).digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good)); }
  catch { return false; }
}

export function parseCookies(req){
  const h = req.headers.cookie || '';
  const out = {};
  h.split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
export function isAuthed(req){
  return verifyToken(parseCookies(req)[COOKIE]);
}
export function cookieHeader(value, maxAge, req){
  const secure = (req.headers['x-forwarded-proto'] === 'https') ? ' Secure;' : '';
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge};${secure}`;
}

export async function readBody(req){
  if (req.body !== undefined && req.body !== null){
    return typeof req.body === 'string' ? safeJson(req.body) : req.body;
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return safeJson(Buffer.concat(chunks).toString('utf8'));
}
function safeJson(s){ try { return JSON.parse(s || '{}'); } catch { return {}; } }

export const MAX_AGE_S = MAX_AGE;
