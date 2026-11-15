<?php
function require_method(...$allowed)
{
    global $res;
    $method = $_SERVER['REQUEST_METHOD'];
    if (!in_array($method, $allowed, true)) {
        header('Allow: ' . implode(', ', $allowed));
        $res->fail('Method not allowed', 405);
    }
    return $method;
}

function read_json_body()
{
    $data = json_decode(file_get_contents('php://input'), true);
    return is_array($data) ? $data : [];
}

function check_required_fields_in_json($data, $fields)
{
    foreach ($fields as $key) {
        if (!key_exists($key, $data)) {
            return false;
        }
    }
    return true;
}

function clip($value, $max)
{
    return mb_substr(trim((string) $value), 0, $max);
}

function safe_url($value)
{
    $value = trim((string) $value);
    if ($value === '' || !filter_var($value, FILTER_VALIDATE_URL)) {
        return null;
    }
    $scheme = parse_url($value, PHP_URL_SCHEME);
    return in_array($scheme, ['http', 'https'], true) ? mb_substr($value, 0, 500) : null;
}

function public_user($user)
{
    return [
        'id' => (int) $user->id,
        'name' => $user->name,
        'email' => $user->email,
    ];
}
