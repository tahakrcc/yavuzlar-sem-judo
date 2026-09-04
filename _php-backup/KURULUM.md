# Yavuzlar Judo — Web Sitesi & Yönetim Paneli

Statik HTML/CSS/JS site + basit **PHP backend** (fotoğrafları kalıcı, tüm ziyaretçilere görünür şekilde saklar).

## Klasör yapısı
```
index.html, hakkimizda.html, galeri.html, iletisim.html, admin.html
css/style.css
js/main.js        → site (fotoğrafları API'den çeker)
js/admin.js       → yönetim paneli
api/config.php    → ayarlar + giriş bilgileri
api/auth.php      → giriş / çıkış
api/photos.php    → fotoğraf ekle / sil / listele
data/photos.json  → fotoğraf kayıtları (otomatik oluşur)
uploads/          → yüklenen resimler (otomatik oluşur)
```

## Yönetici girişi
- URL: `.../admin.html`
- Kullanıcı adı: **candan19**
- Şifre: **••••••**

> Değiştirmek için: `api/config.php` içindeki `ADMIN_USER` ve `ADMIN_PASS`.

## Yayına alma (paylaşımlı hosting / cPanel)
1. Tüm dosyaları hosting'in `public_html` (veya `htdocs`) klasörüne yükleyin.
2. PHP 7.4+ yeterli (çoğu hosting'te hazır gelir).
3. `data/` ve `uploads/` klasörlerinin **yazılabilir** (izin 755/775) olduğundan emin olun.
   Genelde otomatik oluşur; oluşmazsa elle oluşturup izin verin.
4. Siteyi açın → `index.html`. Yönetim → `admin.html`.

Ekstra ayar gerekmez; `.htaccess` dosyaları `data/` erişimini kapatır ve `uploads/`
içinde kod çalışmasını engeller (Apache).

## Yerelde test (macOS/Linux)
Proje klasöründe:
```
php -S localhost:8000
```
Sonra tarayıcıda `http://localhost:8000` (yönetim: `http://localhost:8000/admin.html`).

## Notlar
- Fotoğraf yüklerken max ~6MB (JPG/PNG/WEBP/GIF). Panelden istediğiniz kadar ekleyip silebilirsiniz.
- **Ana Sayfa Görseli** bölümündeki ilk fotoğraf, ana sayfadaki büyük görsel olur.
- Backend erişilemezse (ör. dosyayı sunucusuz açarsanız) site otomatik olarak
  judo temalı yer tutucu görsellerle çalışır — bozulmaz.
