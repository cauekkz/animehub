<?php
require("../../_inc/init.php");
require("../../_inc/jwt.php");

if ($_SERVER['REQUEST_METHOD'] != "GET") {
    $res->set_status("error");
    $res->set_error_message("Method Not Allowed");
    $res->response();
    exit;
}
$headers = getallheaders();
if (!isset($headers['Authorization'])) {
    $res->set_status("error");
    $res->set_error_message("log in to watch");
    $res->response();
    exit;
}


$auth_header = $headers['Authorization'];
$token = str_replace('Bearer ', '', $auth_header);

$jwt = new JwtAuth();
$decoded = $jwt->validate_token($token);

if ($decoded) {
    $res->set_status("error");
    $res->set_error_message("log in to watch");
    $res->response();
}


if (!isset($_GET['episodeLink'])) {
    $res->set_status("error");
    $res->set_error_message("without query param");
    $res->response();
    exit;
}
$urlAnimeOnline = $_GET['episodeLink'];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $urlAnimeOnline);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$html = curl_exec($ch);
$html = trim($html);

if (curl_errno($ch)) {
    $res->set_status("error");
    $res->set_error_message("Episode not exist");
    curl_close($ch);

    $res->response();
    exit;
}
curl_close($ch);
$htmlError = preg_quote('<body class="error404">', '/');
if (preg_match("/$htmlError/", $html)) {
    $res->set_status("error");
    $res->set_error_message("Episode not exist");
    $res->response();
    exit;
}

preg_match_all('/<iframe[^>]+src=["\']([^"\']+)["\'][^>]*>/i', $html, $matches);

if (!empty($matches[1])) {
    $linkEpisode = $matches[1][0];
    $res->set_response_data(["episodeLink" => $linkEpisode]);
} else {
    $res->set_status("error");
    $res->set_error_message("Episode not exist");
}


$res->response();
