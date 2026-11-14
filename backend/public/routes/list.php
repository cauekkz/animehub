<?php
require __DIR__ . '/../../_inc/init.php';
require __DIR__ . '/../../_inc/auth.php';

$method = require_method('GET', 'POST', 'DELETE');
$auth = require_user();
$user_id = (int) $auth['id'];

if ($method === 'GET') {
    $response = $db->execute_query(
        'SELECT anime_id, title, poster, created_at FROM watchlist WHERE user_id = :u ORDER BY created_at DESC',
        ['u' => $user_id]
    );
    if ($response->status !== 'success') {
        $res->fail('Erro ao carregar sua lista', 500);
    }
    $res->ok($response->results);
}

if ($method === 'POST') {
    $data = read_json_body();
    $anime_id = (string) ($data['anime_id'] ?? '');

    if (!ctype_digit($anime_id) || empty($data['title'])) {
        $res->fail('Anime inválido', 422);
    }

    $response = $db->execute_non_query(
        'INSERT INTO watchlist (user_id, anime_id, title, poster) VALUES (:u, :a, :t, :p)
         ON DUPLICATE KEY UPDATE title = VALUES(title), poster = VALUES(poster)',
        ['u' => $user_id, 'a' => $anime_id, 't' => clip($data['title'], 255), 'p' => safe_url($data['poster'] ?? '')]
    );
    if ($response->status !== 'success') {
        $res->fail('Não foi possível salvar', 500);
    }
    $res->set_http_code(201);
    $res->ok(['anime_id' => $anime_id]);
}

$anime_id = (string) ($_GET['anime_id'] ?? '');
if (!ctype_digit($anime_id)) {
    $res->fail('Anime inválido', 422);
}
$response = $db->execute_non_query(
    'DELETE FROM watchlist WHERE user_id = :u AND anime_id = :a',
    ['u' => $user_id, 'a' => $anime_id]
);
if ($response->status !== 'success') {
    $res->fail('Não foi possível remover', 500);
}
$res->ok(['anime_id' => $anime_id]);
