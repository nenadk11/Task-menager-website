<?php
session_start();

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

require_once __DIR__ . '/../../config/db.php';

$data = json_decode(file_get_contents("php://input"), true);

$email = trim($data["email"] ?? "");
$password = $data["password"] ?? "";

//Provera da li je email ili sifra prazna
if(empty($email) || empty($password)){
    echo json_encode(["success" => false, "message" => "Email and password required"]);
    exit;
}

try {

    $stmt = $pdo->prepare("SELECT id, username, email, password FROM users WHERE email = ?");
    $stmt->execute([$email]);

    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if($user && password_verify($password, $user["password"])){

        $_SESSION["user"] = [
            "id" => $user["id"],
            "username" => $user["username"],
            "email" => $user["email"]
        ];

        //Vreme poslednje aktivnosti
        $_SESSION["last_activity"] = time();

        echo json_encode(["success" => true, "user" => $_SESSION["user"]]);

    }else{
        echo json_encode(["success" => false, "message" => "Invalid email or password"]);
    }

}catch(PDOException $e) {
    echo json_encode(["success" => false, "message" => "Server error"]);
}
?>