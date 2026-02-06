//GET - za uzimanje taskova iz backenda
window.addEventListener("DOMContentLoaded", loadTasks);

async function loadTasks() {

    const res = await fetch("http://localhost:8000/backend/api/tasks.php");
    const tasks = await res.json();

    const list = document.getElementById("taskList");
    list.innerHTML = "";

    tasks.forEach(task => {

        const li = document.createElement("li");
        li.innerHTML = `
            <span class="${task.status === "completed" ? "done" : ""}">
                ${task.task}
            </span>

            <div class="task-actions">
                <button class="toggle-btn" onclick="toggleTask(${task.id})"><i class="fa-solid fa-check"></i></button>
                <button class="delete-btn" onclick="deleteTask(${task.id})"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
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

    await fetch("http://localhost:8000/backend/api/tasks.php", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            action: "add",
            task
        })
    });

    await loadTasks();
    taskInput.value = "";
  
});

//funkcija za brisanje taska
async function deleteTask(id) {
    
    await fetch("http://localhost:8000/backend/api/tasks.php", {
        method: "POST",
        headers: {
            "Content-type": "application/json"
        },
        body: JSON.stringify({
            action: "delete",
            id
        })
    });

    await loadTasks();
}

//funkcija za zavrsetak taska
async function toggleTask(id){

    await fetch("http://localhost:8000/backend/api/tasks.php", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            action: "toggle",
            id
        })
    });

    await loadTasks();
}