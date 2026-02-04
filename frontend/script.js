//GET - za uzimanje taskova iz backenda
window.addEventListener("DOMContentLoaded", loadTasks());

async function loadTasks() {

    const res = await fetch("http://localhost:8000/backend/api/tasks.php");
    const tasks = await res.json();

    const list = document.getElementById("taskList");
    list.innerHTML = "";

    tasks.forEach(task => {
        const li = document.createElement("li");
        li.textContent = task.task;
        list.appendChild(li);
    });
    
}

//POST - za slanje taskova backendu
document.getElementById("taskForm").addEventListener("submit", async (e) => {

    e.preventDefault();

    const taskInput = document.getElementById("taskInput");
    const task = taskInput.value.trim();

    if(!task){
        alert("Write a task");
        return;
    }

    const res = await fetch("http://localhost:8000/backend/api/tasks.php", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ task })
    });

    await res.json();
    await loadTasks();
    taskInput.value = "";
  
});