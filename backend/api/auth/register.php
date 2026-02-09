<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

require_once __DIR__ . '/../../config/db.php';

$data = json_decode(file_get_contents("php://input"), true);

$username = trim($data["username"] ?? "");
$email = trim($data["email"] ?? "");
$password = $data["password"] ?? "";

//Provera da li je username prazan ili ima space
if(empty($username) || preg_match('/\s/', $username)){
    echo json_encode(["success" => false, "message" => "Username cannot be empty or contain spaces"]);
    exit;
}

//Provera da li je email ili sifra prazna
if(empty($email) || empty($password)){
    echo json_encode(["success" => false, "message" => "Email and password required"]);
    exit;
}

//Hashovanje sifre
$hashedPassword = password_hash($password, PASSWORD_DEFAULT);

//Ubacivanje u bazu
$stmt = $pdo->prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)");

if($stmt->execute([$username, $email, $hashedPassword])){
    echo json_encode(["success" => true]);
}else {
    echo json_encode(["success" => false, "message" => "User already exists"]);
}
?>