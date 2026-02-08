<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

require_once __DIR__ . '/../../config/db.php';

//GET logika
if($_SERVER["REQUEST_METHOD"] === "GET"){

    //Uzme taskove iz baze
    $stmt = $pdo->query("SELECT * FROM tasks ORDER BY id DESC");
    $task = $stmt->fetchAll(PDO::FETCH_ASSOC);

    //Vrati frontendu
    echo json_encode($task);
    exit;
}

//POST logika
if($_SERVER["REQUEST_METHOD"] === "POST"){

    //Uzme json od frontend-a
    $data = json_decode(file_get_contents("php://input"), true);

    //Provera da li je action poslat
    if(empty($data["action"])){
        echo json_encode(["error" => "No action provided"]);
        exit;
    }

    //Action add - dodaj task
    if($data["action"] === "add"){
        
        //Ako je poslat task
        if(!empty($data["task"])){
            $task = trim($data["task"]);

            //Insert taska u bazu
            $stmt = $pdo->prepare("INSERT INTO tasks (task) VALUES (:task)");
            $stmt->execute(["task" => $task]);

            echo json_encode(["success" => true]);

        }else {
            echo json_encode(["error" => "Task is empty"]);
        }
    }

    //Action delete - obrisi task
    if($data["action"] === "delete"){

        //Ako je poslat id
        if(!empty($data["id"])){

            //Brisanje taska iz baze
            $stmt = $pdo->prepare("DELETE FROM tasks WHERE id = :id");
            $stmt->execute(["id" => $data["id"]]);

            echo json_encode(["success" => true]);
        }
    }

    //Action toggle - promeni status taska
    if($data["action"] === "toggle"){

        if(!empty($data["id"])){

            //Promena statusa taska u bazi
            $stmt = $pdo->prepare("
                UPDATE tasks
                SET status = CASE
                    WHEN status = 'pending' THEN 'completed'
                    ELSE 'pending'
                END
                WHERE id = :id
            ");
            $stmt->execute(["id" => $data["id"]]);

            echo json_encode(["success" => true]);
        }
    }
}
?>