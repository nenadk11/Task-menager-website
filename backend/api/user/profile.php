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

//GET - vrati podatke korisnika
if ($_SERVER["REQUEST_METHOD"] === "GET") {

    $stmt = $pdo->prepare("
        SELECT username, email
        FROM users
        WHERE id = :id
    ");

    $stmt->execute(["id" => $userId]);

    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode($user);
    exit;
}

//POST - updejtuj profil
if ($_SERVER["REQUEST_METHOD"] === "POST") {

    $data = json_decode(file_get_contents("php://input"), true);

    //Update profila
    if ($data["action"] === "update_profile") {

        $fields = [];
        $params = ["id" => $userId];

        //Ako postoji username
        if (!empty($data["username"])) {

            $username = $data["username"];

            //Provera duzine username
            if (strlen($username) < 4 || strlen($username) > 20) {
                echo json_encode(["error" => "Username must be 4-20 characters"]);
                exit;
            }

            //Provera da li ima space
            if (preg_match('/\s/', $username)) {
                echo json_encode(["error" => "Username cannot contain spaces"]);
                exit;
            }

            //Provera da li username vec postoji u bazi
            $stmt = $pdo->prepare("
                SELECT id FROM users 
                WHERE username = :username AND id != :id
            ");
            $stmt->execute([
                "username" => $username,
                "id" => $userId
            ]);

            if ($stmt->fetch()) {
                echo json_encode(["error" => "Username already taken"]);
                exit;
            }

            $fields[] = "username = :username";
            $params["username"] = $username;
        }

        //Ako postoji email
        if (!empty($data["email"])) {

            $email = $data["email"];

            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                echo json_encode(["error" => "Invalid email"]);
                exit;
            }

            //Provera da li email vec postoji u bazi
            $stmt = $pdo->prepare("
                SELECT id FROM users 
                WHERE email = :email AND id != :id
            ");
            $stmt->execute([
                "email" => $email,
                "id" => $userId
            ]);

            if ($stmt->fetch()) {
                echo json_encode(["error" => "Email already taken"]);
                exit;
            }

            $fields[] = "email = :email";
            $params["email"] = $email;
        }

        //Ako nema ništa
        if (empty($fields)) {
            echo json_encode(["error" => "Nothing to update"]);
            exit;
        }

        $sql = "UPDATE users SET " . implode(", ", $fields) . " WHERE id = :id";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        //Udejtuj session ako je username promenjen
        if (!empty($username)) {
            $_SESSION["user"]["username"] = $username;
        }

        echo json_encode(["success" => true]);
        exit;
    }

    //Promena sifre
    if ($data["action"] === "change_password") {

        $current = $data["currentPassword"];
        $new = $data["newPassword"];

        $stmt = $pdo->prepare("SELECT password FROM users WHERE id = :id");
        $stmt->execute(["id" => $userId]);

        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        //Provera current password
        if (!password_verify($current, $user["password"])) {
            echo json_encode(["error" => "Current password is incorrect"]);
            exit;
        }

        //Provera duzine passworda
        if (strlen($new) < 8) {
            echo json_encode(["error" => "Password must be at least 8 characters"]);
            exit;
        }

        //Provera novog passworda
        if (password_verify($new, $user["password"])) {
            echo json_encode(["error" => "New password must be different"]);
            exit;
        }

        //Hash novi password
        $newHash = password_hash($new, PASSWORD_DEFAULT);

        $stmt = $pdo->prepare("
            UPDATE users SET password = :password WHERE id = :id
        ");

        $stmt->execute([
            "password" => $newHash,
            "id" => $userId
        ]);

        echo json_encode(["success" => true]);
        exit;
    }
}
?>