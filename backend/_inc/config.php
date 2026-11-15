<?php
function env($key, $default = null)
{
    $value = getenv($key);
    return ($value === false || $value === '') ? $default : $value;
}

define('API_VERSION', 'v1.1.0');

define('API_ACTIVE', true);
define('API_MESSAGE', '');

define('MYSQL_HOST', env('DB_HOST', 'localhost'));
define('MYSQL_DBNAME', env('DB_NAME', 'streaming'));
define('MYSQL_USER', env('DB_USER', 'root'));
define('MYSQL_PASS', env('DB_PASS', ''));

define('JWT_SECRET', env('JWT_SECRET', 'dev-only-secret-change-this-0123456789abcdef'));
define('JWT_TTL', 60 * 60 * 24 * 7);
