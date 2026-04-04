<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode(["error" => "Invalid request"]);
    exit;
}

session_start();

//Obriši session cookie
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(
        session_name(),
        '',
        time() - 42000,
        $params["path"],
        $params["domain"],
        $params["secure"],
        $params["httponly"]
    );
}

session_unset();
session_destroy();

echo json_encode(["success" => true]);
?>