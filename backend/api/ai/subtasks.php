<?php

header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);

$task = $data["task"] ?? "";

if(!$task){
    echo json_encode(["error" => "Missing task"]);
    exit;
}

$apiKey = "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";

$prompt = "Break this task into 3-5 short actionable subtasks.
Return only JSON array of strings.
Answer in the language the task title is.

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