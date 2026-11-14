<?php
require_once __DIR__ . '/jwt.php';

function get_bearer_token()
{
    $header = $_SERVER['HTTP_AUTHORIZATION']
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
        ?? null;

    if (!$header && function_exists('getallheaders')) {
        foreach (getallheaders() as $name => $value) {
            if (strcasecmp($name, 'Authorization') === 0) {
                $header = $value;
                break;
            }
        }
    }

    if ($header && preg_match('/^Bearer\s+(\S+)$/i', $header, $m)) {
        return $m[1];
    }
    return null;
}

function require_user()
{
    global $res;

    $token = get_bearer_token();
    if (!$token) {
        $res->fail('Faça login para continuar', 401);
    }

    $decoded = (new JwtAuth())->validate_token($token);
    if (!$decoded) {
        $res->fail('Sessão expirada, entre de novo', 401);
    }

    return $decoded;
}
