<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

require_once "../config/db.php";

//Uzmi json od frontend-a
$data = json_decode(file_get_contents("php://input"), true);

//Proveri da li postoji task
if(!empty($data["task"])){
    $task = trim($data["task"]);

    //Insert taska u bazu
    $stmt = $pdo->prepare("INSERT INTO tasks (task) VALUES (:task)");
    $stmt->execute([
        "task" => $task
    ]);

    //Vrati nazad frontend-u
    echo json_encode([
        "task" => $task
    ]);

}else {
    echo json_encode([
        "error" => "Task is empty"
    ]);
}
?>