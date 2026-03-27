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

//GET - vrati notifikacije
if($_SERVER["REQUEST_METHOD"] === "GET"){

    $stmt = $pdo->prepare("
        SELECT * FROM notifications
        WHERE user_id = :user_id
        ORDER BY created_at DESC
    ");

    $stmt->execute(["user_id" => $userId]);

    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    exit;
}

//POST - obrisi notifikacije
if($_SERVER["REQUEST_METHOD"] === "POST"){

    $data = json_decode(file_get_contents("php://input"), true);

    //Obrisi notifikaciju nakon citanja
    if($data["action"] === "delete" && !empty($data["id"])){

        $stmt = $pdo->prepare("
            DELETE FROM notifications
            WHERE id = :id AND user_id = :user_id
        ");

        $stmt->execute([
            "id" => $data["id"],
            "user_id" => $userId
        ]);

        echo json_encode(["success" => true]);
        exit;
    }

    //Obrisi sve notifikacije
    if($data["action"] === "delete_all"){
        $stmt = $pdo->prepare("
            DELETE FROM notifications
            WHERE user_id = :user_id
        ");

        $stmt->execute(["user_id" => $userId]);

        echo json_encode(["success" => true]);
        exit;
    }
}