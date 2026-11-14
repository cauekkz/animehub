<?php

require("../../_inc/init.php");
require("../../_inc/jwt.php");

if ($_SERVER['REQUEST_METHOD'] != "GET") {
    $res->set_status("error");
    $res->set_error_message("Method Not Allowed");
    $res->response();
    exit;
}
if (!isset($_GET['animeName'])) {
    $res->set_status("error");
    $res->set_error_message("without query param");
    $res->response();
    exit;
}


$animeName = $_GET['animeName'];
$url = "https://animesonlinecc.to/anime/$animeName/";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$html = curl_exec($ch);

if (curl_errno($ch)) {
    $res->set_status("error");
    $res->set_error_message("Anime Not exist");
    curl_close($ch);
    exit;
}

curl_close($ch);
$html = trim($html);
$htmlError = preg_quote('<body class="error404">', '/');
if (preg_match("/$htmlError/", $html)) {
    $res->set_status("error");
    $res->set_error_message("Anime Not exist");
    $res->response();
    exit;
}

$htmlSeasons =  '/<span class="se-t ">\d+<\/span>| <span class="se-t se-o">\d+<\/span>/';
preg_match_all($htmlSeasons, $html, $matchesSeasons);
$seasonsQtn = count($matchesSeasons[0]);


$htmleps = '/<div class="imagen"><a href="(https:\/\/animesonlinecc\.to\/episodio\/[^"]*episodio-([01]))\/">/';
preg_match_all($htmleps, $html, $matcheslinksSeasons);
$seasonsEpLinks = $matcheslinksSeasons[1];

$htmlLasteps = '/<a href="https:\/\/animesonlinecc\.to\/episodio\/[^"]*-episodio-(\d+)\/">[^<]*<\/a>\s*<span class="date">[^<]*<\/span><\/div><\/li><\/ul>/';
preg_match_all($htmlLasteps, $html, $matchesLastEps);
$lastEps = $matchesLastEps[1];


$htmlThumbnails = '/<div class="imagen">\s*<a href="[^"]*">\s*<img src="([^"]*)"/';
preg_match_all($htmlThumbnails, $html, $matcheslinksThumbnails);
$ThumbNailsEpLinks = $matcheslinksThumbnails[1];


$epLinks = array_map(null, $seasonsEpLinks, $lastEps);


$res->set_response_data(["seasons" => $seasonsQtn, "epLinks" => $epLinks, "thumbnails" => $ThumbNailsEpLinks, "lasteps" => $lastEps]);

$res->response();
