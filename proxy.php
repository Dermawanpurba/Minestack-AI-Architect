<?php
/**
 * PHP Proxy for PRD Editor AI Requests
 * Forwards chat completion requests from local XAMPP environment to AI API upstream.
 * Automatically attempts fallback models on HTTP 502 / router_error.
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Target-URL");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$input = file_get_contents('php://input');
$headers = getallheaders();

$targetUrl = 'https://siaptuan.my.id/v1/chat/completions';
foreach ($headers as $key => $val) {
    if (strtolower($key) === 'x-target-url') {
        $targetUrl = $val;
        break;
    }
}

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

$data = json_decode($input, true);
$primaryModel = isset($data['model']) ? $data['model'] : 'combo1';

$candidateModels = array_values(array_unique([
    $primaryModel,
    'gpt-4o-mini',
    'gemini-1.5-flash',
    'combo1',
    'claude-3-5-haiku'
]));

$lastHttpCode = 502;
$lastResponse = '';

foreach ($candidateModels as $idx => $model) {
    $currentData = $data;
    if (is_array($currentData)) {
        $currentData['model'] = $model;
        $payload = json_encode($currentData);
    } else {
        $payload = $input;
    }

    $ch = curl_init($targetUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
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
        $lastHttpCode = 502;
        $lastResponse = json_encode(['error' => ['message' => 'PHP cURL Error: ' . $curlErr]]);
        continue;
    }

    $lastHttpCode = $httpCode ? $httpCode : 500;
    $lastResponse = $response;

    if ($httpCode >= 200 && $httpCode < 300) {
        break;
    }

    $isRouterError = ($httpCode === 502 || $httpCode === 503 || $httpCode === 504 || 
                      preg_match('/temporarily unavailable|router_error|model_not_found|busy|overloaded/i', $response));

    if (!$isRouterError || $idx === count($candidateModels) - 1) {
        break;
    }

    usleep(1200000); // Wait 1.2s before trying fallback model
}

http_response_code($lastHttpCode);
header("Content-Type: application/json; charset=utf-8");
echo $lastResponse;
