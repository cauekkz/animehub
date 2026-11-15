<?php
require __DIR__ . '/../../_inc/init.php';
require __DIR__ . '/../../_inc/jwt.php';
require __DIR__ . '/../../_inc/validation/signupValidator.php';

require_method('POST');

$data = read_json_body();
$errors = validateSignup($data);

if (!empty($errors)) {
    $res->fail('Please check the fields', 422, $errors);
}

$name = trim($data['name']);
$email = mb_strtolower(trim($data['email']));

$exists = $db->execute_query('SELECT id FROM `user` WHERE email = :email', ['email' => $email]);
if ($exists->status !== 'success') {
    $res->fail("Couldn't create the account right now", 500);
}
if (!empty($exists->results)) {
    $res->fail('This email already has an account', 409, ['email' => 'This email already has an account. Want to log in?']);
}

$response = $db->execute_non_query(
    'INSERT INTO `user` (name, email, password) VALUES (:name, :email, :password)',
    ['name' => $name, 'email' => $email, 'password' => password_hash($data['password'], PASSWORD_DEFAULT)]
);

if ($response->status !== 'success') {
    $res->fail("Couldn't create the account right now", 500);
}

$user = (object) ['id' => $response->last_id, 'name' => $name, 'email' => $email];
$token = (new JwtAuth())->generate_token_user($user);

$res->set_http_code(201);
$res->ok(['token' => $token, 'user' => public_user($user)]);
