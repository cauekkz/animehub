<?php
header('Content-Type: text/html; charset=UTF-8');
ini_set('display_errors', 1);
error_reporting(E_ALL);
$page = $_GET['p'] ?? 'home';
$page = str_replace('/', '-', $page);
$filePath = "../../../frontend/$page.html";

if (is_file($filePath) && is_readable($filePath)) {
    $content = file_get_contents($filePath);
    
    if ($content !== false) {
        echo $content;
    } else {
        http_response_code(500);
    }
} else {
    
    echo file_get_contents("../../../frontend/404.html");
   
}

?>
