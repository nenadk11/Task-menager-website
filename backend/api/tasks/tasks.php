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
    
        if(!empty($data["task"])){

            $task = trim($data["task"]);

            // PRIORITY VALIDACIJA
            $allowedPriorities = ['minor','normal','critical'];
            $priority = 'normal';

            if(!empty($data["priority"]) && in_array($data["priority"], $allowedPriorities)){
                $priority = $data["priority"];
            }

            $stmt = $pdo->prepare("
                INSERT INTO tasks (task, priority) 
                VALUES (:task, :priority)
            ");

            $stmt->execute([
                "task" => $task,
                "priority" => $priority
            ]);

            echo json_encode(["success" => true]);

        } else {
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

    //Action update - promeni priority/ime taska
    if($data["action"] === "update"){
        if(!empty($data["id"]) && !empty($data["task"])){
            $stmt = $pdo->prepare("UPDATE tasks SET task = :task, priority = :priority WHERE id = :id");
            $stmt->execute([
                "task" => trim($data["task"]),
                "priority" => $data["priority"],
                "id" => $data["id"]
            ]);
            echo json_encode(["success" => true]);
        } else {
            echo json_encode(["error" => "Missing data"]);
        }
    }

    //Action clear all - obrisi sve taskove
    if($data["action"] == "clear_all"){
        
        $stmt = $pdo->prepare("DELETE FROM tasks");
        $stmt->execute();

        echo json_encode(["success" => true]);
    }

}
?>