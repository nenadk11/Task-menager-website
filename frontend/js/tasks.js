import { checkAuth } from "./auth.js";

const modal = document.getElementById("taskModal");
const openModalBtn = document.getElementById("openModalBtn");
const cancelBtn = document.querySelector(".btn-secondary");
const taskTitleInput = document.getElementById("taskTitle");
const taskPriorityInput = document.getElementById("taskPriority");
const taskDueDateInput = document.getElementById("taskDueDate");

let editingTaskId = null;

function openModal() {
    modal.classList.add("active");
}

function closeModal() {
    modal.classList.remove("active");
}

if (openModalBtn) {
    openModalBtn.addEventListener("click", () => {
        //Resetuje se modal kad user otvori da pravi novi task
        editingTaskId = null;
        taskTitleInput.value = "";
        taskPriorityInput.value = "normal";
        taskDueDateInput.value = "";
        openModal();
    });
}

if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
});

//Funkcija za formatiranje datuma
function formatDueDate(dueDate) {
    if (!dueDate) return "";

    const today = new Date();
    const due = new Date(dueDate);

    today.setHours(0,0,0,0);
    due.setHours(0,0,0,0);

    const diffTime = due - today;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays < 0) return `Overdue (${Math.abs(diffDays)}d)`;
    return `In ${diffDays} days`;
}

(async () => {
    const user = await checkAuth();
    if(!user) return;

    console.log("Logged user:", user);

    const greetingDiv = document.getElementById("greeting");
    if (greetingDiv) {
        greetingDiv.innerHTML = `<h1>Welcome back ${user.username}!</h1>`;
    }

    let unfinishedTasksCount = 0;

    const onHoldContainer = document.getElementById("onHoldTasks");
    const completedContainer = document.getElementById("completedTasks");

    const form = document.getElementById("taskForm");

    const taskCountEl = document.getElementById("taskCount");
    const totalTaskEl = document.getElementById("totalTask");
    const completedCountEl = document.getElementById("completedCount");
    const pendingCountEl = document.getElementById("pendingCount");
    const completionRateValue = document.getElementById("completionRateValue");
    const completionProgress = document.getElementById("completionProgress");

    await loadTasks();

    //GET - za ucitavanje taskova iz backenda
    async function loadTasks() {
        try {
            const res = await fetch("/backend/api/tasks/tasks.php");
            const tasks = await res.json();

            onHoldContainer.innerHTML = "";
            completedContainer.innerHTML = "";

            let completed = 0;
            let pending = 0;

            tasks.forEach(task => {
                const card = document.createElement("div");
                card.className = "task-item";
                card.dataset.id = task.id;
                card.dataset.duedate = task.due_date || "";

                const isCompleted = task.status === "completed";

                let displayStatus = isCompleted ? "Completed" : "Pending";

                if (!isCompleted && task.due_date) {
                    const today = new Date();
                    const due = new Date(task.due_date);
                    today.setHours(0,0,0,0);
                    due.setHours(0,0,0,0);
                    if (due < today) {
                        displayStatus = "Expired";
                    }
                }

                if (isCompleted) completed++;
                else pending++;

                const dueText = formatDueDate(task.due_date);

                card.innerHTML = `
                    <div class="task-checkbox ${isCompleted ? "completed" : ""}"></div>

                    <div class="task-content">
                        <div class="task-title ${isCompleted ? "done" : ""}">
                            ${task.task}
                        </div>
                    </div>

                    ${task.due_date && !isCompleted ?`
                        <div class="due-badge ${dueText.startsWith("Overdue") ? "due-overdue" : "due-normal"}">
                        <i class="fa-regular fa-alarm-clock"></i>    
                        <span>${dueText}</span>
                        </div>
                    ` : ""}

                    <span class="status-badge ${
                        displayStatus === "Completed" ? "status-completed" :
                        displayStatus === "Expired" ? "status-expired" :
                        "status-pending"
                    }">
                        ${displayStatus}
                    </span>

                    <div class="priority-badge priority-${task.priority}">
                        <i class="fas fa-circle"></i>
                        <span class="priority-text">${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span>
                    </div>

                    <button class="icon-btn edit-btn" style="width:35px;height:35px;">
                        <i class="fas fa-pen"></i>
                    </button>

                    <button class="icon-btn delete-btn" style="width:35px;height:35px;">
                        <i class="fas fa-trash"></i>
                    </button>
                `;

                if (isCompleted) {
                    completedContainer.appendChild(card);
                } else {
                    onHoldContainer.appendChild(card);
                }
            });

            updateStats(tasks.length, completed, pending);

        } catch (err) {
            console.error("Error loading tasks:", err);
        }
    }

    //Event delegation za toggle/delete/edit
    document.addEventListener("click", async (e) => {
        const card = e.target.closest(".task-item");
        if (!card) return;

        const id = card.dataset.id;

        //Zavrsi task
        if (e.target.closest(".task-checkbox")) {
            await toggleTask(id);
            await loadTasks();
            return;
        }

        //Obrisi task
        if (e.target.closest(".delete-btn")) {
            await deleteTask(id);
            await loadTasks();
            return;
        }

        //Edituj task
        if (e.target.closest(".edit-btn")) {
            editingTaskId = id;

            const taskTitle = card.querySelector(".task-title").textContent.trim();
            const priorityClass = card.querySelector(".priority-badge").classList;
            let priority = "normal";

            if (priorityClass.contains("priority-minor")) priority = "minor";
            else if (priorityClass.contains("priority-normal")) priority = "normal";
            else if (priorityClass.contains("priority-critical")) priority = "critical";

            taskTitleInput.value = taskTitle;
            taskPriorityInput.value = priority;
            taskDueDateInput.value = card.dataset.duedate || "";

            openModal();
            return;
        }
    });

    //POST - za slanje taskova backendu
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const task = taskTitleInput.value.trim();
        const priority = taskPriorityInput.value;
        const due_date = taskDueDateInput.value || null;

        if (!task) return;

        try {
            if (editingTaskId) {
                //UPDATE posto editujemo
                await fetch("/backend/api/tasks/tasks.php", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: "update",
                        id: editingTaskId,
                        task,
                        priority,
                        due_date
                    })
                });
            } else {
                //ADD novi task
                await fetch("/backend/api/tasks/tasks.php", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: "add",
                        task,
                        priority,
                        due_date
                    })
                });
            }

            editingTaskId = null;
            taskTitleInput.value = "";
            taskDueDateInput.value = "";
            closeModal();
            await loadTasks();

        } catch (err) {
            console.error("Error saving task:", err);
        }
    });

    //funkcija za brisanje taska
    async function deleteTask(id) {
        try {
            await fetch("/backend/api/tasks/tasks.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    action: "delete",
                    id
                })
            });        
        } catch(err) {
            console.error("Error deleting task:", err);
        }
    }

    //funkcija za zavrsetak taska
    async function toggleTask(id){
        try {
            await fetch("/backend/api/tasks/tasks.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    action: "toggle",
                    id
                })
            });           
        } catch(err) {
            console.error("Error toggling task:", err);
        }
    }

    async function clearAllTasks(){

        let message = "Delete all tasks?";

        if(unfinishedTasksCount > 0){
            message = `You have ${unfinishedTasksCount} unfinished task${unfinishedTasksCount > 1 ? "s" : ""}. Are you sure you want to delete all tasks?`;
        }

        if(!confirm(message)) return;

        try {
            await fetch("/backend/api/tasks/tasks.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    action: "clear_all"
                })
            });

            await loadTasks();
        }catch(err) {
            console.error("Error clearing all tasks", err);
        }
    }

    //funkcija za statistiku
    function updateStats(total, completed, pending) {

        taskCountEl.textContent = pending;
        totalTaskEl.textContent = total;
        completedCountEl.textContent = completed;
        pendingCountEl.textContent = pending;

        const rate = total === 0 ? 0 : Math.round((completed / total) * 100);

        const taskWordEl = document.getElementById("taskWord");
        taskWordEl.textContent = (pending === 1) ? "task" : "tasks";

        completionRateValue.textContent = rate + "%";
        completionProgress.style.width = rate + "%";
    }

    document.getElementById("clear-all-btn").addEventListener("click", clearAllTasks);


})();