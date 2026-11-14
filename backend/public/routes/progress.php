<?php
require __DIR__ . '/../../_inc/init.php';
require __DIR__ . '/../../_inc/auth.php';

$method = require_method('GET', 'POST', 'DELETE');
$auth = require_user();
$user_id = (int) $auth['id'];

if ($method === 'GET') {
    $response = $db->execute_query(
        'SELECT anime_id, title, poster, cover, episode, episode_count, updated_at
           FROM progress WHERE user_id = :u ORDER BY updated_at DESC LIMIT 20',
        ['u' => $user_id]
    );
    if ($response->status !== 'success') {
        $res->fail('Erro ao carregar seu progresso', 500);
    }
    foreach ($response->results as $row) {
        $row->episode = (int) $row->episode;
        $row->episode_count = $row->episode_count !== null ? (int) $row->episode_count : null;
    }
    $res->ok($response->results);
}

if ($method === 'POST') {
    $data = read_json_body();
    $anime_id = (string) ($data['anime_id'] ?? '');
    $episode = filter_var($data['episode'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 100000]]);
    $count = filter_var($data['episode_count'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 100000]]);

    if (!ctype_digit($anime_id) || $episode === false || empty($data['title'])) {
        $res->fail('Dados inválidos', 422);
    }

    $response = $db->execute_non_query(
        'INSERT INTO progress (user_id, anime_id, title, poster, cover, episode, episode_count)
         VALUES (:u, :a, :t, :p, :c, :e, :n)
         ON DUPLICATE KEY UPDATE title = VALUES(title), poster = VALUES(poster), cover = VALUES(cover),
                                 episode = VALUES(episode), episode_count = VALUES(episode_count),
                                 updated_at = CURRENT_TIMESTAMP',
        [
            'u' => $user_id,
            'a' => $anime_id,
            't' => clip($data['title'], 255),
            'p' => safe_url($data['poster'] ?? ''),
            'c' => safe_url($data['cover'] ?? ''),
            'e' => $episode,
            'n' => $count === false ? null : $count,
        ]
    );
    if ($response->status !== 'success') {
        $res->fail('Não foi possível salvar o progresso', 500);
    }
    $res->ok(['anime_id' => $anime_id, 'episode' => $episode]);
}

$anime_id = (string) ($_GET['anime_id'] ?? '');
if (!ctype_digit($anime_id)) {
    $res->fail('Anime inválido', 422);
}
$response = $db->execute_non_query(
    'DELETE FROM progress WHERE user_id = :u AND anime_id = :a',
    ['u' => $user_id, 'a' => $anime_id]
);
if ($response->status !== 'success') {
    $res->fail('Não foi possível remover', 500);
}
$res->ok(['anime_id' => $anime_id]);
