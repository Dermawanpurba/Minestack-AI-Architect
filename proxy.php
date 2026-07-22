<?php
/**
 * PHP Proxy for PRD Editor AI Requests
 * Forwards chat completion requests from local XAMPP environment to AI API upstream.
 */

// Allow CORS for local dev
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Target-URL");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$input = file_get_contents('php://input');
$headers = getallheaders();

// Extract Target URL from header or fallback
$targetUrl = 'https://siaptuan.my.id/v1/chat/completions';
foreach ($headers as $key => $val) {
    if (strtolower($key) === 'x-target-url') {
        $targetUrl = $val;
        break;
    }
}

// Extract Authorization header
$authHeader = '';
foreach ($headers as $key => $val) {
    if (strtolower($key) === 'authorization') {
        $authHeader = $val;
        break;
    }
}

if (empty($input)) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Empty request body']]);
    exit;
}

$ch = curl_init($targetUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
curl_setopt($ch, CURLOPT_POSTFIELDS, $input);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: ' . $authHeader
]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
curl_setopt($ch, CURLOPT_TIMEOUT, 60);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr = curl_error($ch);
curl_close($ch);

if ($response === false) {
    http_response_code(502);
    echo json_encode(['error' => ['message' => 'PHP cURL Error: ' . $curlErr]]);
    exit;
}

http_response_code($httpCode ? $httpCode : 500);
header("Content-Type: application/json; charset=utf-8");
echo $response;
