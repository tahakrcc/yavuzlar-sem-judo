# Vercel'e Yükleme Rehberi — Yavuzlar Judo

Bu proje Vercel için hazırlandı:
- Site (HTML/CSS/JS) → statik olarak yayınlanır
- `api/auth.js`, `api/photos.js` → Vercel **Serverless Functions** (Node.js)
- Fotoğraflar → **Vercel Blob** depolamada saklanır (kalıcı, tüm ziyaretçilerde görünür)

Admin panelin çalışması için **tek şart: Vercel Blob deposunu açmak** (ücretsiz).

---

## Adım 1 — Projeyi Vercel'e gönder
İki yoldan biri:

### A) En kolay: Vercel CLI (GitHub gerekmez)
Proje klasöründe terminal aç:
```
npx vercel login
npx vercel
```
Soruları varsayılanlarla geç (Enter). İlk yayın tamam.

### B) GitHub ile
1. Projeyi bir GitHub deposuna yükle.
2. vercel.com → **Add New → Project** → repoyu seç → **Deploy**.

> `node_modules`, `data/`, `uploads/`, `_php-backup/` otomatik hariç tutulur (`.vercelignore`).

## Adım 2 — Vercel Blob deposunu aç (fotoğraflar için)
1. Vercel panosunda projene gir → üstten **Storage** sekmesi.
2. **Create Database → Blob** → isim ver (ör. `yavuzlar-fotolar`) → **Create**.
3. Açılan ekranda **Connect to Project** → bu projeyi seç.
   → Bu işlem `BLOB_READ_WRITE_TOKEN` ortam değişkenini otomatik ekler.

## Adım 3 — (Önerilir) Güvenlik ortam değişkeni
Projede **Settings → Environment Variables** → ekle:
| Name | Value |
|------|-------|
| `AUTH_SECRET` | rastgele uzun bir metin (ör. `k9$2mQ...`) |

İstersen giriş bilgilerini de buradan ayarlayabilirsin (kodda değişiklik gerekmez):
| Name | Value |
|------|-------|
| `ADMIN_USER` | candan19 |
| `ADMIN_PASS_SHA` | parolanın SHA-256'sı |

> Parola SHA-256 üretmek: `node -e "console.log(require('crypto').createHash('sha256').update('YENI_PAROLA').digest('hex'))"`
> Hiç dokunmazsan varsayılan giriş geçerli: **candan19 / ••••••**.

## Adım 4 — Yeniden yayınla
Ortam değişkenleri eklendikten sonra bir kez daha yayınla:
```
npx vercel --prod
```
(GitHub kullandıysan: panoda **Redeploy** de.)

## Adım 5 — Domain'i bağla
1. Vercel → proje → **Settings → Domains** → domainini yaz (ör. `yavuzlarjudo.com`).
2. Vercel sana **DNS kayıtları** (A / CNAME) verir.
3. **Turkticaret.Net** paneli → Domain → DNS yönetimi → bu kayıtları gir.
4. SSL (https) Vercel'de otomatik gelir. Birkaç saatte yayılır.

---

## Kullanım
- Site: `senindomainin.com`
- Yönetim: `senindomainin.com/admin.html` → **candan19 / ••••••**
- Panelden fotoğraf ekle/sil, başlık düzenle. Değişiklikler tüm ziyaretçilerde görünür.

## Notlar
- Fotoğraflar yüklenmeden önce tarayıcıda otomatik küçültülüp sıkıştırılır (hız + boyut).
- Blob deposu açılmadan da site açılır; sadece admin fotoğraf yükleme, depo açılınca çalışır.
- PHP sürümü `_php-backup/` klasöründe duruyor (ileride PHP hosting istersen).
