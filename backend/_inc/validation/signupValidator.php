<?php
function validateSignup($data)
{
    $errors = [];
    $name = trim($data['name'] ?? '');

    if (mb_strlen($name) < 3) {
        $errors['name'] = 'Your name needs at least 3 letters';
    } elseif (mb_strlen($name) > 70) {
        $errors['name'] = 'Your name can have at most 70 characters';
    }

    if (empty($data['email']) || !filter_var($data['email'], FILTER_VALIDATE_EMAIL) || strlen($data['email']) > 100) {
        $errors['email'] = 'Enter a valid email';
    }

    if (empty($data['password']) || strlen($data['password']) < 8) {
        $errors['password'] = 'The password needs at least 8 characters';
    } elseif (strlen($data['password']) > 72) {
        $errors['password'] = 'The password can have at most 72 characters';
    }

    if (($data['conf_password'] ?? null) !== ($data['password'] ?? null)) {
        $errors['conf_password'] = "The passwords don't match";
    }

    return $errors;
}
