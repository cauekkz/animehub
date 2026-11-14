<?php
require __DIR__ . '/../../_inc/init.php';
require __DIR__ . '/../../_inc/auth.php';

require_method('GET');

$auth = require_user();

$response = $db->execute_query('SELECT id, name, email FROM `user` WHERE id = :id', ['id' => $auth['id']]);

if ($response->status !== 'success') {
    $res->fail('Erro ao carregar o perfil', 500);
}
if (empty($response->results)) {
    $res->fail('Conta não encontrada', 401);
}

$res->ok(public_user($response->results[0]));
