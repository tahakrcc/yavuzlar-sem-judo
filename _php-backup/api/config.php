<?php
/* ===== Yavuzlar Judo - Backend yapılandırması ===== */

// Yönetici kullanıcı adı
const ADMIN_USER = 'candan19';

// Yönetici şifresi — güvenlik için düz metin DEĞİL, bcrypt hash olarak saklanır.
// Şifreyi değiştirmek için yeni hash üretin:
//   php -r 'echo password_hash("YENİ_ŞİFRE", PASSWORD_DEFAULT);'
// çıkan değeri aşağıya yapıştırın (mevcut şifre: ••••••).
const ADMIN_PASS_HASH = '$2y$12$WGUXikx5TXIHncIZD37gY.styKeGlyZ3LY/nIpaOpIxFi00TpSbxy';

// Klasör yolları
define('DATA_DIR', __DIR__ . '/../data');
define('UPLOAD_DIR', __DIR__ . '/../uploads');
define('DATA_FILE', DATA_DIR . '/photos.json');

// Web'den erişim yolu (uploads klasörünün siteye göre yolu)
const UPLOAD_URL = 'uploads/';

// İzin verilen resim türleri ve maksimum boyut (byte)
const ALLOWED_TYPES = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'];
const MAX_BYTES = 6 * 1024 * 1024; // ~6MB

// Oturum başlat
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

// ---- Yardımcılar ----
function ensure_dirs(): void {
    foreach ([DATA_DIR, UPLOAD_DIR] as $d) {
        if (!is_dir($d)) @mkdir($d, 0775, true);
    }
    if (!file_exists(DATA_FILE)) {
        file_put_contents(DATA_FILE, json_encode(['hero' => [], 'galeri' => []], JSON_PRETTY_PRINT));
    }
}

function read_data(): array {
    ensure_dirs();
    $raw = @file_get_contents(DATA_FILE);
    $d = $raw ? json_decode($raw, true) : null;
    if (!is_array($d)) $d = [];
    return ['hero' => $d['hero'] ?? [], 'galeri' => $d['galeri'] ?? []];
}

function write_data(array $d): bool {
    ensure_dirs();
    $fp = fopen(DATA_FILE, 'c+');
    if (!$fp) return false;
    flock($fp, LOCK_EX);
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($d, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
    return true;
}

function is_admin(): bool {
    return !empty($_SESSION['yav_admin']);
}

function require_admin(): void {
    if (!is_admin()) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'Yetkisiz. Lütfen giriş yapın.']);
        exit;
    }
}

function json_body(): array {
    $raw = file_get_contents('php://input');
    $d = json_decode($raw, true);
    return is_array($d) ? $d : [];
}

function out(array $payload, int $code = 200): void {
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}
