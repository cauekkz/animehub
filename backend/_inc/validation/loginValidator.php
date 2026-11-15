<?php
function validatelogin($data)
{
    $errors = [];

    if (empty($data['email']) || !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        $errors['email'] = 'Enter a valid email';
    }

    if (empty($data['password'])) {
        $errors['password'] = 'Enter your password';
    }

    return $errors;
}
