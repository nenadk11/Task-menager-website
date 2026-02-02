document.getElementById("taskForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const taskInput = document.getElementById("taskInput");
    const task = taskInput.value.trim();

    if(!task){
        alert("Write a task");
        return;
    }

    const res = await fetch("http://localhost/backend/api/tasks.php", {
        method: "POST",
        headers: {
            "Content-Type":"application/json"
        },
        body: JSON.stringify({ task })
    });

    const data = await res.json();

    const li = document.createElement("li");
    li.textContent = data.task;

    document.getElementById("taskList").appendChild(li);

    taskInput.value = "";
  
});