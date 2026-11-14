<?php
function validateSignup($data)
{
    $errors = [];
    $name = trim($data['name'] ?? '');

    if (mb_strlen($name) < 3) {
        $errors['name'] = 'O nome precisa ter pelo menos 3 letras';
    } elseif (mb_strlen($name) > 70) {
        $errors['name'] = 'O nome pode ter no máximo 70 caracteres';
    }

    if (empty($data['email']) || !filter_var($data['email'], FILTER_VALIDATE_EMAIL) || strlen($data['email']) > 100) {
        $errors['email'] = 'Digite um email válido';
    }

    if (empty($data['password']) || strlen($data['password']) < 8) {
        $errors['password'] = 'A senha precisa ter pelo menos 8 caracteres';
    } elseif (strlen($data['password']) > 72) {
        $errors['password'] = 'A senha pode ter no máximo 72 caracteres';
    }

    if (($data['conf_password'] ?? null) !== ($data['password'] ?? null)) {
        $errors['conf_password'] = 'As senhas não são iguais';
    }

    return $errors;
}
