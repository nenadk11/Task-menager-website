<?php

// Funkcija koja čita .env fajl i vraća array
function loadEnv($path) {
    $env = [];
    if(!file_exists($path)) return $env;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach($lines as $line){
        if (strpos(trim($line), '#') === 0) continue; // preskoči komentare
        $parts = explode('=', $line, 2);
        if(count($parts) == 2){
            $env[trim($parts[0])] = trim($parts[1]);
        }
    }
    return $env;
}
$env = loadEnv(__DIR__ . '/../../../.env');

header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);

$task = $data["task"] ?? "";

if(!$task){
    echo json_encode(["error" => "Missing task"]);
    exit;
}

$apiKey = $env['OPENROUTER_API_KEY'] ?? null;

$prompt = "Break this task into 4 short actionable subtasks.
Return only JSON array of strings.
Answer in the language the task title is, it will usually be either serbian or english.

Task: $task";

$payload = [
    "model" => "openrouter/free",
    "messages" => [
        [
            "role" => "user",
            "content" => $prompt
        ]
    ]
];

$ch = curl_init("https://openrouter.ai/api/v1/chat/completions");

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        "Authorization: Bearer " . $apiKey,
        "Content-Type: application/json",
        "HTTP-Referer: http://localhost",
        "X-Title: TaskApp"
    ],
    CURLOPT_POSTFIELDS => json_encode($payload)
]);

$response = curl_exec($ch);

if($response === false){
    echo json_encode(["error" => curl_error($ch)]);
    exit;
}

$result = json_decode($response, true);

$text = $result["choices"][0]["message"]["content"] ?? "[]";

$text = preg_replace('/```json|```/', '', $text);
$text = trim($text);

$subtasks = json_decode($text, true);

if(!$subtasks){
    $subtasks = [];
}

$subtasks = array_slice($subtasks, 0, 5);
$subtasks = array_map('trim', $subtasks);

echo json_encode($subtasks);
?>