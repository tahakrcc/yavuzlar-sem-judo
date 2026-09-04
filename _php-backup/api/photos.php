<?php
/* ===== Fotoğraf listeleme / ekleme / silme ===== */
require __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

/* ---- Herkese açık: fotoğrafları listele ---- */
if ($method === 'GET') {
    out(['ok' => true, 'photos' => read_data()]);
}

if ($method !== 'POST') {
    out(['ok' => false, 'error' => 'Desteklenmeyen istek'], 405);
}

/* ---- Bundan sonrası yönetici gerektirir ---- */
require_admin();

$body   = json_body();
$action = $body['action'] ?? '';
$section = ($body['section'] ?? '') === 'hero' ? 'hero' : 'galeri';
$data = read_data();

/* ---- Ekle ---- */
if ($action === 'add') {
    $dataUrl = (string)($body['dataUrl'] ?? '');
    $caption = trim((string)($body['caption'] ?? ''));

    if (!preg_match('#^data:([^;]+);base64,(.+)$#s', $dataUrl, $m)) {
        out(['ok' => false, 'error' => 'Geçersiz resim verisi.'], 400);
    }
    $mime = strtolower($m[1]);
    if (!isset(ALLOWED_TYPES[$mime])) {
        out(['ok' => false, 'error' => 'Sadece JPG, PNG, WEBP, GIF yükleyebilirsiniz.'], 400);
    }
    $bin = base64_decode($m[2], true);
    if ($bin === false) out(['ok' => false, 'error' => 'Resim çözümlenemedi.'], 400);
    if (strlen($bin) > MAX_BYTES) out(['ok' => false, 'error' => 'Dosya çok büyük (max ~6MB).'], 400);

    $ext = ALLOWED_TYPES[$mime];
    $id  = 'p' . time() . substr(bin2hex(random_bytes(4)), 0, 6);
    $fname = $id . '.' . $ext;
    if (@file_put_contents(UPLOAD_DIR . '/' . $fname, $bin) === false) {
        out(['ok' => false, 'error' => 'Dosya kaydedilemedi (klasör izinleri?).'], 500);
    }

    $item = ['id' => $id, 'src' => UPLOAD_URL . $fname, 'file' => $fname,
             'caption' => $caption !== '' ? $caption : 'Fotoğraf'];
    $data[$section][] = $item;
    write_data($data);
    out(['ok' => true, 'item' => $item]);
}

/* ---- Sil ---- */
if ($action === 'delete') {
    $id = (string)($body['id'] ?? '');
    $found = null;
    $data[$section] = array_values(array_filter($data[$section], function ($p) use ($id, &$found) {
        if (($p['id'] ?? '') === $id) { $found = $p; return false; }
        return true;
    }));
    if ($found && !empty($found['file'])) {
        @unlink(UPLOAD_DIR . '/' . basename($found['file']));
    }
    write_data($data);
    out(['ok' => true]);
}

/* ---- Başlık güncelle ---- */
if ($action === 'update') {
    $id = (string)($body['id'] ?? '');
    $caption = trim((string)($body['caption'] ?? ''));
    $ok = false;
    foreach ($data[$section] as &$p) {
        if (($p['id'] ?? '') === $id) {
            $p['caption'] = $caption !== '' ? mb_substr($caption, 0, 120) : 'Fotoğraf';
            $ok = true;
            break;
        }
    }
    unset($p);
    if (!$ok) out(['ok' => false, 'error' => 'Fotoğraf bulunamadı.'], 404);
    write_data($data);
    out(['ok' => true]);
}

/* ---- Sıralama (opsiyonel: id dizisi) ---- */
if ($action === 'reorder') {
    $order = $body['order'] ?? [];
    if (is_array($order)) {
        $map = [];
        foreach ($data[$section] as $p) $map[$p['id']] = $p;
        $new = [];
        foreach ($order as $id) if (isset($map[$id])) $new[] = $map[$id];
        // listede olup order'da olmayanları sona ekle
        foreach ($data[$section] as $p) if (!in_array($p['id'], $order, true)) $new[] = $p;
        $data[$section] = $new;
        write_data($data);
    }
    out(['ok' => true, 'photos' => read_data()]);
}

out(['ok' => false, 'error' => 'Bilinmeyen işlem.'], 400);
