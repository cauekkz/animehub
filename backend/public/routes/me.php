<?php
require __DIR__ . '/../../_inc/init.php';
require __DIR__ . '/../../_inc/auth.php';

require_method('GET');

$auth = require_user();

$response = $db->execute_query('SELECT id, name, email FROM `user` WHERE id = :id', ['id' => $auth['id']]);

if ($response->status !== 'success') {
    $res->fail('Error loading the profile', 500);
}
if (empty($response->results)) {
    $res->fail('Account not found', 401);
}

$res->ok(public_user($response->results[0]));
