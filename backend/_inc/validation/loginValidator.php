<?php
function validatelogin($data)
{
    $errors = [];

    if (empty($data['email']) || !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        $errors['email'] = 'Digite um email válido';
    }

    if (empty($data['password'])) {
        $errors['password'] = 'Digite sua senha';
    }

    return $errors;
}
