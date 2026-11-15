<?php
use bng\System\Database;

require_once __DIR__ . '/../vendor/autoload.php';

header('Content-Type: application/json; charset=UTF-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/database.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/helper.php';

date_default_timezone_set('America/Sao_Paulo');

$res = new Response();

if (!API_ACTIVE) {
    $res->fail(API_MESSAGE ?: 'API under maintenance', 503);
}

$db = new Database([
    'server' => MYSQL_HOST,
    'dbname' => MYSQL_DBNAME,
    'user' => MYSQL_USER,
    'pass' => MYSQL_PASS,
]);
