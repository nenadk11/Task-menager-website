<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

session_start();

//Timeout 30 dana
$timeout = 60 * 60 * 24 * 30;

//Ako je session istekao
if(isset($_SESSION["last_activity"]) && (time() - $_SESSION["last_activity"]) > $timeout){
    session_unset();
    session_destroy();

    echo json_encode(["loggedIn" => false]);
    exit;
}

//Updatuj activity time
$_SESSION["last_activity"] = time();

if(isset($_SESSION["user"])){
    echo json_encode([
        "loggedIn" => true,
        "user" => $_SESSION["user"]
    ]);
}else{
    echo json_encode(["loggedIn" => false]);
}
?>