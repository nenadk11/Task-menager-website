<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

require_once __DIR__ . '/../../config/db.php';

session_start();

if (!isset($_SESSION["user"])) {
    echo json_encode(["error" => "Unauthorized"]);
    exit;
}

$userId = $_SESSION["user"]["id"];

//Funkcija koja čita .env fajl i vraća array
function loadEnv($path) {
    $env = [];
    if(!file_exists($path)) return $env;

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

    foreach($lines as $line){
        if (strpos(trim($line), '#') === 0) continue;

        $parts = explode('=', $line, 2);
        if(count($parts) == 2){
            $env[trim($parts[0])] = trim($parts[1]);
        }
    }

    return $env;
}

$env = loadEnv(__DIR__ . '/../../../.env');
$apiKey = $env['OPENROUTER_API_KEY'] ?? null;

if (!$apiKey) {
    echo json_encode(["error" => "API key missing"]);
    exit;
}

//GET logika
if ($_SERVER["REQUEST_METHOD"] === "GET") {

    $stmt = $pdo->prepare("
        SELECT analysis_text, next_update_at
        FROM user_ai_insights
        WHERE user_id = :user_id
    ");

    $stmt->execute(["user_id" => $userId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        echo json_encode([
            "analysis" => null,
            "canUpdate" => true
        ]);
        exit;
    }

    $now = new DateTime();
    $nextUpdate = new DateTime($row["next_update_at"]);

    echo json_encode([
        "analysis" => $row["analysis_text"],
        "canUpdate" => $now >= $nextUpdate,
        "nextUpdateAt" => $row["next_update_at"]
    ]);

    exit;
}

//POST logika
if ($_SERVER["REQUEST_METHOD"] === "POST") {

    //Cooldown provera
    $stmt = $pdo->prepare("
        SELECT next_update_at
        FROM user_ai_insights
        WHERE user_id = :user_id
    ");

    $stmt->execute(["user_id" => $userId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($row) {
        $now = new DateTime();
        $nextUpdate = new DateTime($row["next_update_at"]);

        if ($now < $nextUpdate) {
            echo json_encode([
                "error" => "Cooldown active",
                "nextUpdateAt" => $row["next_update_at"]
            ]);
            exit;
        }
    }

    //stats
    $stmt = $pdo->prepare("
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN completed_at IS NOT NULL THEN 1 ELSE 0 END) as completed,
            SUM(CASE 
                WHEN due_date IS NOT NULL 
                AND due_date < NOW() 
                AND completed_at IS NULL 
                THEN 1 ELSE 0 
            END) as overdue
        FROM tasks
        WHERE user_id = :user_id
        AND NOT (status = 'pending' AND deleted_at IS NOT NULL)
    ");

    $stmt->execute(["user_id" => $userId]);
    $stats = $stmt->fetch(PDO::FETCH_ASSOC);

    //avgTime
    $stmt = $pdo->prepare("
        SELECT AVG(TIMESTAMPDIFF(HOUR, created_at, completed_at)) as avg_time
        FROM tasks
        WHERE user_id = :user_id
        AND completed_at IS NOT NULL
    ");

    $stmt->execute(["user_id" => $userId]);
    $avgTime = $stmt->fetchColumn();
    $avgTime = $avgTime ? round($avgTime, 1) : 0;

    //Uzimanje poslednjih 20 taskova za analizu
    $stmt = $pdo->prepare("
        SELECT 
            task,
            priority,
            status,
            created_at,
            completed_at,
            deleted_at,
            TIMESTAMPDIFF(HOUR, created_at, COALESCE(completed_at, deleted_at)) as life_span
        FROM tasks
        WHERE user_id = :user_id
        AND NOT (status = 'pending' AND deleted_at IS NOT NULL)
        ORDER BY created_at DESC
        LIMIT 20
    ");

    $stmt->execute(["user_id" => $userId]);
    $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);

    //Ai prompt
    $prompt = "
You are an AI productivity assistant.

Analyze user productivity based only on provided data.

=== STATISTICS ===
- Total tasks: " . ($stats['total'] ?? 0) . "
- Completed tasks: " . ($stats['completed'] ?? 0) . "
- Overdue tasks: " . ($stats['overdue'] ?? 0) . "
- Average completion time: {$avgTime} hours

=== TASK DATA ===
" . json_encode($tasks, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "

IMPORTANT RULES:
- Use plain text only
- Do not use markdown
- Do not use symbols like #, *, |
- Use '-' for bullet points
- Do not invent data
- Base analysis only on given tasks

Format:

Productivity:
- ...

Problems:
- ...

Habits:
- ...

Suggestions:
- ...
";

    //Poziv ai-a
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
        CURLOPT_TIMEOUT => 60,
        CURLOPT_CONNECTTIMEOUT => 10,
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
        echo json_encode([
            "error" => "AI trenutno nije dostupan, pokušaj kasnije"
        ]);
        exit;
    }

    $result = json_decode($response, true);

    if (!isset($result["choices"][0]["message"]["content"])) {
        echo json_encode(["error" => "AI response invalid"]);
        exit;
    }

    $text = $result["choices"][0]["message"]["content"];
    $analysis = trim($text);

    //Sacuvaj rezultat
    $nextUpdateAt = date("Y-m-d H:i:s", strtotime("+7 days"));

    $stmt = $pdo->prepare("
        INSERT INTO user_ai_insights (user_id, analysis_text, next_update_at)
        VALUES (:user_id, :analysis, :next_update)
        ON DUPLICATE KEY UPDATE
            analysis_text = :analysis,
            next_update_at = :next_update,
            updated_at = NOW()
    ");

    $stmt->execute([
        "user_id" => $userId,
        "analysis" => $analysis,
        "next_update" => $nextUpdateAt
    ]);

    echo json_encode([
        "analysis" => $analysis,
        "nextUpdateAt" => $nextUpdateAt
    ]);

    exit;
}

echo json_encode(["error" => "Invalid request method"]);
?>