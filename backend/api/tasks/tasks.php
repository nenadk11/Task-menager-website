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

//GET logika
if($_SERVER["REQUEST_METHOD"] === "GET"){

    //Uzme taskove iz baze
    $stmt = $pdo->prepare("SELECT * FROM tasks WHERE user_id = :user_id ORDER BY id DESC");
    $stmt->execute(["user_id" => $userId]);
    $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);

    //Uzme sve subtaskove
    $stmtSub = $pdo->prepare("
        SELECT subtasks.*
        FROM subtasks
        JOIN tasks ON subtasks.task_id = tasks.id
        WHERE tasks.user_id = :user_id
    ");
    $stmtSub->execute(["user_id" => $userId]);
    $subtasks = $stmtSub->fetchAll(PDO::FETCH_ASSOC);

    //Mapira subtasks po task_id
    $subtasksByTask = [];
    foreach($subtasks as $sub){
        $subtasksByTask[$sub["task_id"]][] = $sub;
    }

    //Dodaje subtask svakom tasku
    foreach($tasks as &$task){
        $task["subtasks"] = $subtasksByTask[$task["id"]] ?? [];
    }

    unset($task);

    //Generisi notifikacije
    $today = new DateTime();
    $today->setTime(0,0,0);

    foreach($tasks as $task){

        if(!empty($task["due_date"]) && $task["status"] !== "completed"){

            $due = new DateTime($task["due_date"]);
            $due->setTime(0,0,0);

            $diff = (int)$today->diff($due)->format("%r%a");

            if($diff === 1 && $task["due_tomorrow_notified"] == 0){

                $stmt = $pdo->prepare("
                    INSERT INTO notifications (user_id, task_id, type, message)
                    VALUES (:user_id, :task_id, 'due_tomorrow', :message)
                ");

                $stmt->execute([
                    "user_id" => $userId,
                    "task_id" => $task["id"],
                    "message" => '⏰ "' . $task["task"] . '" is due tomorrow'
                ]);

                $pdo->prepare("UPDATE tasks SET due_tomorrow_notified = 1 WHERE id = ?")
                    ->execute([$task["id"]]);
            }

            if($diff === 0 && $task["due_today_notified"] == 0){

                $stmt = $pdo->prepare("
                    INSERT INTO notifications (user_id, task_id, type, message)
                    VALUES (:user_id, :task_id, 'due_today', :message)
                ");

                $stmt->execute([
                    "user_id" => $userId,
                    "task_id" => $task["id"],
                    "message" => '⚠️ "' . $task["task"] . '" is due today'
                ]);

                $pdo->prepare("UPDATE tasks SET due_today_notified = 1 WHERE id = ?")
                    ->execute([$task["id"]]);
            }

            if($diff < 0 && $task["overdue_notified"] == 0){

                $stmt = $pdo->prepare("
                    INSERT INTO notifications (user_id, task_id, type, message)
                    VALUES (:user_id, :task_id, 'overdue', :message)
                ");

                $stmt->execute([
                    "user_id" => $userId,
                    "task_id" => $task["id"],
                    "message" => '❌ "' . $task["task"] . '" is overdue'
                ]);

                $pdo->prepare("UPDATE tasks SET overdue_notified = 1 WHERE id = ?")
                    ->execute([$task["id"]]);
            }
        }
        
    }

    //Vrati frontendu
    echo json_encode($tasks);
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
                INSERT INTO tasks (task, priority, user_id, due_date) 
                VALUES (:task, :priority, :user_id, :due_date)
            ");

            $stmt->execute([
                "task" => $task,
                "priority" => $priority,
                "user_id" => $userId,
                "due_date" => !empty($data["due_date"]) ? $data["due_date"] : null
            ]);

            $taskId = $pdo->lastInsertId();

            if(!empty($data["subtasks"]) && is_array($data["subtasks"])){

                $stmtSub = $pdo->prepare("
                    INSERT INTO subtasks (task_id, title) 
                    VALUES (:task_id, :title)
                ");

                foreach($data["subtasks"] as $sub){
                    if(trim($sub) !== ""){
                        $stmtSub->execute([
                            "task_id" => $taskId,
                            "title" => trim($sub)
                        ]);
                    }
                }
            }

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
            $stmt = $pdo->prepare("DELETE FROM tasks WHERE id = :id AND user_id = :user_id");
            $stmt->execute([
                "id" => $data["id"],
                "user_id" => $userId
                ]);

            echo json_encode(["success" => true]);
        }
    }

    //Action toggle - promeni status taska
    if($data["action"] === "toggle"){

        if(!empty($data["id"])){

            //Uzmi trenutni status taska
            $stmt = $pdo->prepare("
                SELECT status 
                FROM tasks 
                WHERE id = :id AND user_id = :user_id
            ");

            $stmt->execute([
                "id" => $data["id"],
                "user_id" => $userId
            ]);

            $currentStatus = $stmt->fetchColumn();

            //Odredi novi status
            $newStatus = ($currentStatus === "completed") ? "pending" : "completed";

            //Update task
            $stmt = $pdo->prepare("
                UPDATE tasks
                SET status = :status
                WHERE id = :id AND user_id = :user_id
            ");

            $stmt->execute([
                "status" => $newStatus,
                "id" => $data["id"],
                "user_id" => $userId
            ]);

            //Update svih subtaskova
            $stmt = $pdo->prepare("
                UPDATE subtasks
                JOIN tasks ON subtasks.task_id = tasks.id
                SET subtasks.status = :status
                WHERE subtasks.task_id = :task_id
                AND tasks.user_id = :user_id
            ");

            $stmt->execute([
                "status" => $newStatus,
                "task_id" => $data["id"],
                "user_id" => $userId
            ]);

            echo json_encode(["success" => true]);
        }
    }

    //Action update - promeni priority/ime taska
    if($data["action"] === "update"){
        if(!empty($data["id"]) && !empty($data["task"])){

            $stmt = $pdo->prepare("
            UPDATE tasks
            SET task = :task, 
                priority = :priority, 
                due_date = :due_date,
                due_tomorrow_notified = 0,
                due_today_notified = 0,
                overdue_notified = 0
            WHERE id = :id AND user_id = :user_id
            ");

            $stmt->execute([
                "task" => trim($data["task"]),
                "priority" => $data["priority"],
                "due_date" => !empty($data["due_date"]) ? $data["due_date"] : null,
                "id" => $data["id"],
                "user_id" => $userId
            ]);

            //SUBTASK UPDATE
            if(isset($data["subtasks"])){

                //Obriši stare subtasks
                $stmtDel = $pdo->prepare("
                    DELETE FROM subtasks
                    WHERE task_id = :task_id
                    AND task_id IN (
                        SELECT id FROM tasks WHERE user_id = :user_id
                    )
                ");

                $stmtDel->execute([
                    "task_id" => $data["id"],
                    "user_id" => $userId
                ]);

                //Dodaj nove subtasks
                $stmtSub = $pdo->prepare("
                    INSERT INTO subtasks (task_id, title)
                    VALUES (:task_id, :title)
                ");

                foreach($data["subtasks"] as $sub){
                    if(trim($sub) !== ""){
                        $stmtSub->execute([
                            "task_id" => $data["id"],
                            "title" => trim($sub)
                        ]);
                    }
                }
            }

            echo json_encode(["success" => true]);

        } else {
            echo json_encode(["error" => "Missing data"]);
        }
    }

    //Action clear all - obrisi sve taskove
    if($data["action"] == "clear_completed"){
        
        $stmt = $pdo->prepare("
            DELETE FROM tasks
            WHERE user_id = :user_id
            AND status = 'completed'
            ");
        $stmt->execute(["user_id" => $userId]);

        echo json_encode(["success" => true]);
    }

    //Action toggle subtask - promeni status subtaska
    if($data["action"] === "toggle_subtask"){

        if(!empty($data["id"])){

            //Promeni status subtaska
            $stmt = $pdo->prepare("
                UPDATE subtasks
                JOIN tasks ON subtasks.task_id = tasks.id
                SET subtasks.status = CASE
                    WHEN subtasks.status = 'pending' THEN 'completed'
                    ELSE 'pending'
                END
                WHERE subtasks.id = :id AND tasks.user_id = :user_id
            ");

            $stmt->execute([
                "id" => $data["id"],
                "user_id" => $userId
            ]);

            //Uzmi task_id tog subtaska
            $stmt = $pdo->prepare("
                SELECT subtasks.task_id
                FROM subtasks
                JOIN tasks ON subtasks.task_id = tasks.id
                WHERE subtasks.id = :id AND tasks.user_id = :user_id
            ");
            $stmt->execute([
                "id" => $data["id"],
                "user_id" => $userId
            ]);
            $taskId = $stmt->fetchColumn();

            //Koliko ima ukupno subtasks
            $stmt = $pdo->prepare("
                SELECT COUNT(*) 
                FROM subtasks 
                WHERE task_id = :task_id
            ");
            $stmt->execute(["task_id" => $taskId]);
            $total = $stmt->fetchColumn();

            //Koliko je completed
            $stmt = $pdo->prepare("
                SELECT COUNT(*) 
                FROM subtasks 
                WHERE task_id = :task_id AND status = 'completed'
            ");
            $stmt->execute(["task_id" => $taskId]);
            $completed = $stmt->fetchColumn();

            //Ako su svi completed - task completed
            if($total > 0 && $total == $completed){

                $stmt = $pdo->prepare("
                    UPDATE tasks
                    SET status = 'completed'
                    WHERE id = :task_id AND user_id = :user_id
                ");

                $stmt->execute([
                    "task_id" => $taskId,
                    "user_id" => $userId
                ]);

            } else {

                //Ako nije sve completed - task vrati na pending
                $stmt = $pdo->prepare("
                    UPDATE tasks
                    SET status = 'pending'
                    WHERE id = :task_id AND user_id = :user_id
                ");

                $stmt->execute([
                    "task_id" => $taskId,
                    "user_id" => $userId
                ]);
            }

            echo json_encode(["success" => true]);
        }
    }

}
?>