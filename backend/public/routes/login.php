<?php
require __DIR__ . '/../../_inc/init.php';
require __DIR__ . '/../../_inc/jwt.php';
require __DIR__ . '/../../_inc/validation/loginValidator.php';

require_method('POST');

$data = read_json_body();
$errors = validatelogin($data);

if (!empty($errors)) {
    $res->fail('Please check the fields', 422, $errors);
}

$email = mb_strtolower(trim($data['email']));

$response = $db->execute_query(
    'SELECT id, name, email, password FROM `user` WHERE email = :email',
    ['email' => $email]
);

if ($response->status !== 'success') {
    $res->fail("Couldn't log you in right now, try again", 500);
}

if (empty($response->results) || !password_verify($data['password'], $response->results[0]->password)) {
    $res->fail('Wrong email or password', 401);
}

$user = $response->results[0];
$token = (new JwtAuth())->generate_token_user($user);

$res->ok(['token' => $token, 'user' => public_user($user)]);
