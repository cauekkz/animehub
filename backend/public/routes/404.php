<?php
http_response_code(404);
header('Content-Type: application/json; charset=UTF-8');

echo json_encode([
    'status' => 'error',
    'error_message' => 'Route not found',
], JSON_UNESCAPED_UNICODE);
exit;
