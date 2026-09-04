<?php
/* ===== Giriş / Çıkış / Durum ===== */
require __DIR__ . '/config.php';

$action = $_GET['action'] ?? '';

if ($action === 'status') {
    out(['ok' => true, 'loggedIn' => is_admin()]);
}

if ($action === 'logout') {
    $_SESSION = [];
    session_destroy();
    out(['ok' => true]);
}

if ($action === 'login') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') out(['ok' => false, 'error' => 'POST gerekli'], 405);
    $b = json_body();
    $u = trim($b['user'] ?? '');
    $p = (string)($b['pass'] ?? '');
    // Kullanıcı adı sabit zamanlı, şifre bcrypt hash ile doğrulanır
    if (hash_equals(ADMIN_USER, $u) && password_verify($p, ADMIN_PASS_HASH)) {
        session_regenerate_id(true);
        $_SESSION['yav_admin'] = true;
        out(['ok' => true]);
    }
    // Basit brute-force yavaşlatma
    usleep(400000);
    out(['ok' => false, 'error' => 'Kullanıcı adı veya şifre hatalı.'], 401);
}

out(['ok' => false, 'error' => 'Geçersiz işlem'], 400);
