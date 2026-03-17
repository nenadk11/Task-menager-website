import { checkAuth } from "./auth.js";

const modal = document.getElementById("taskModal");
const openModalBtn = document.getElementById("openModalBtn");
const cancelBtn = document.querySelector(".btn-secondary");
const taskTitleInput = document.getElementById("taskTitle");
const taskPriorityInput = document.getElementById("taskPriority");
const taskDueDateInput = document.getElementById("taskDueDate");
const subtasksContainer = document.getElementById("subtasksContainer");
const addSubtaskBtn = document.getElementById("addSubtaskBtn");

let expandedTasks = new Set();

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
        subtasksContainer.innerHTML = "";
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

    const onHoldContainer = document.getElementById("onHoldTasks");
    const completedContainer = document.getElementById("completedTasks");

    const form = document.getElementById("taskForm");

    const taskCountEl = document.getElementById("taskCount");
    const totalTaskEl = document.getElementById("totalTask");
    const completedCountEl = document.getElementById("completedCount");
    const pendingCountEl = document.getElementById("pendingCount");
    const completionRateValue = document.getElementById("completionRateValue");
    const completionProgress = document.getElementById("completionProgress");
    const clearCompletedBtn = document.getElementById("clear-completed-btn");
    const filterSelect = document.getElementById("taskFilter");

    const sortBtn = document.getElementById("sortBtn");
    let currentSort = "default";

    const sortModes = ["default", "due", "priority-high", "priority-low"];

    const savedSort = localStorage.getItem("taskSortMode");
    if (savedSort && sortModes.includes(savedSort)) {
        currentSort = savedSort;
    }

    const savedFilter = localStorage.getItem("taskFilter");
    if (savedFilter) {
        filterSelect.value = savedFilter;
    }

    updateSortButtonText();
    await loadTasks();

    //Dodavanje subtask inputa
    if(addSubtaskBtn){
        addSubtaskBtn.addEventListener("click", () => {

            const wrapper = document.createElement("div");
            wrapper.classList.add("subtask-row");

            const input = document.createElement("input");
            input.type = "text";
            input.placeholder = "Subtask title";
            input.classList.add("subtask-input");

            const removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.textContent = "✕";
            removeBtn.classList.add("remove-subtask");

            removeBtn.addEventListener("click", () => {
                wrapper.remove();
            });

            wrapper.appendChild(input);
            wrapper.appendChild(removeBtn);

            subtasksContainer.appendChild(wrapper);
        });
    }

    //Pamti sort koji je bio
    sortBtn.addEventListener("click", () => {
        const currentIndex = sortModes.indexOf(currentSort);
        const nextIndex = (currentIndex + 1) % sortModes.length;

        currentSort = sortModes[nextIndex];

        localStorage.setItem("taskSortMode", currentSort);

        updateSortButtonText();
        loadTasks();
    });

    //Funkcija za sort
    function updateSortButtonText() {
        let text = "Default";

        if (currentSort === "due") text = "Due date";
        if (currentSort === "priority-high") text = "High Priority";
        if (currentSort === "priority-low") text = "Low Priority";

        sortBtn.innerHTML = `<i class="fa-solid fa-sort"></i> Sort: ${text}`;
    }

    //GET - za ucitavanje taskova iz backenda
    async function loadTasks() {
        try {
            const res = await fetch("/backend/api/tasks/tasks.php");
            const tasks = await res.json();

            onHoldContainer.innerHTML = "";
            completedContainer.innerHTML = "";

            let completed = 0;
            let pending = 0;

            const pendingTasks = tasks.filter(t => t.status !== "completed");
            const completedTasks = tasks.filter(t => t.status === "completed");

            //Sortiramo samo pending u zavisnosti od moda
            if (currentSort === "due") {
                pendingTasks.sort((a, b) => {
                    if (!a.due_date) return 1;
                    if (!b.due_date) return -1;
                    return new Date(a.due_date) - new Date(b.due_date);
                });
            }

            if (currentSort === "priority-high") {
                const order = { critical: 3, normal: 2, minor: 1 };
                pendingTasks.sort((a, b) => order[b.priority] - order[a.priority]);
            }

            if (currentSort === "priority-low") {
                const order = { critical: 3, normal: 2, minor: 1 };
                pendingTasks.sort((a, b) => order[a.priority] - order[b.priority]);
            }

            const sortedTasks = [...pendingTasks, ...completedTasks];

            sortedTasks.forEach(task => {
                const group = document.createElement("div");
                group.className = "task-group";
                group.dataset.taskId = task.id;
                const card = document.createElement("div");
                card.className = "task-item";
                card.dataset.id = task.id;
                group.dataset.subtasks = JSON.stringify(task.subtasks || []);
                card.dataset.duedate = task.due_date || "";
                card.dataset.priority = task.priority;
                group.appendChild(card);

                const totalSubs = task.subtasks ? task.subtasks.length : 0;
                const doneSubs = task.subtasks ? task.subtasks.filter(s => s.status === "completed").length : 0;

                const isCompleted = task.status === "completed";

                let displayStatus = isCompleted ? "completed" : "pending";

                if (!isCompleted && task.due_date) {
                    const today = new Date();
                    const due = new Date(task.due_date);
                    today.setHours(0,0,0,0);
                    due.setHours(0,0,0,0);
                    if (due < today) {
                        displayStatus = "expired";
                    }
                }

                card.dataset.status = displayStatus;

                if (isCompleted) completed++;
                else pending++;

                const dueText = formatDueDate(task.due_date);

                card.innerHTML = `
                    <div class="task-checkbox ${isCompleted ? "completed" : ""}"></div>

                    ${task.subtasks && task.subtasks.length > 0 ? `
                        <button class="expand-btn">
                            <i class="fas fa-chevron-right"></i>
                            <span class="subtask-count">
                                ${doneSubs}/${totalSubs}
                            </span>
                        </button>
                    ` : ""}

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
                        displayStatus === "completed" ? "status-completed" :
                        displayStatus === "expired" ? "status-expired" :
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

                //Render subtasks ako postoje
                if(task.subtasks && task.subtasks.length > 0){

                    const subWrapper = document.createElement("div");
                    subWrapper.className = "subtasks-wrapper";

                    task.subtasks.forEach(sub => {

                        const subCard = document.createElement("div");
                        subCard.className = "task-item subtask-card";

                        subCard.innerHTML = `
                            <div class="subtask-checkbox ${sub.status === "completed" ? "completed" : ""}" 
                                data-subtask-id="${sub.id}"></div>

                            <div class="task-content">
                                <div class="task-title ${sub.status === "completed" ? "done" : ""}" style="font-size:13px;font-weight:400">
                                    ${sub.title}
                                </div>
                            </div>
                        `;

                        subWrapper.appendChild(subCard);
                    });

                    if(expandedTasks.has(String(task.id))){
                        subWrapper.classList.add("open");

                        const btn = group.querySelector(".expand-btn");
                        if(btn){
                            btn.classList.add("open");
                        }
                    }

                    group.appendChild(subWrapper);
                }

                if (isCompleted) {
                    completedContainer.appendChild(group);
                } else {
                    onHoldContainer.appendChild(group);
                }
            });

            if (completed > 0) {
                clearCompletedBtn.style.display = "inline-flex"; 
            } else {
                clearCompletedBtn.style.display = "none";
            }

            updateStats(tasks.length, completed, pending);

            applyFilter();
        } catch (err) {
            console.error("Error loading tasks:", err);
        }
    }

    //Event delegation za toggle/delete/edit
    document.addEventListener("click", async (e) => {

        //Toggle subtask
        const subCheckbox = e.target.closest(".subtask-card")?.querySelector(".subtask-checkbox");

        if(subCheckbox){

            const subId = subCheckbox.dataset.subtaskId;

            const res = await fetch("/backend/api/tasks/tasks.php", {
                method:"POST",
                headers:{
                    "Content-Type":"application/json"
                },
                body: JSON.stringify({
                    action:"toggle_subtask",
                    id: subId
                })
            });

            const data = await res.json();

            if(data.success){
                await loadTasks();   
            }
            
            return;
        }

        const card = e.target.closest(".task-item");
        if (!card) return;

        const id = card.dataset.id;

        //Expanduj subtaskove
        if (e.target.closest(".expand-btn")) {

            const btn = e.target.closest(".expand-btn");
            const group = btn.closest(".task-group");
            const wrapper = group.querySelector(".subtasks-wrapper");
            const taskId = group.dataset.taskId;

            if(wrapper){
                wrapper.classList.toggle("open");
                btn.classList.toggle("open");

                if(wrapper.classList.contains("open")){
                    expandedTasks.add(taskId);
                }else{
                    expandedTasks.delete(taskId);
                }
            }

            return;
        }

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

            subtasksContainer.innerHTML = "";
            const group = card.closest(".task-group");
            const subtasks = JSON.parse(group.dataset.subtasks || "[]");

            subtasks.forEach(sub => {
                const wrapper = document.createElement("div");
                wrapper.classList.add("subtask-row");

                const input = document.createElement("input");
                input.type = "text";
                input.value = sub.title;
                input.classList.add("subtask-input");

                const removeBtn = document.createElement("button");
                removeBtn.type = "button";
                removeBtn.textContent = "✕";
                removeBtn.classList.add("remove-subtask");

                removeBtn.onclick = () => wrapper.remove();

                wrapper.appendChild(input);
                wrapper.appendChild(removeBtn);

                subtasksContainer.appendChild(wrapper);
            });

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

        const subtasks = [];

        document.querySelectorAll(".subtask-input").forEach(input => {
            const value = input.value.trim();
            if(value !== ""){
                subtasks.push(value);
            }
        });

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
                        due_date,
                        subtasks
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
                        due_date,
                        subtasks
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

    //Funlcija za brisanje completed taskova
    async function clearCompletedTasks(){

        let message = "Delete all completed tasks?";

        if(!confirm(message)) return;

        try {
            await fetch("/backend/api/tasks/tasks.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    action: "clear_completed"
                })
            });

            await loadTasks();
        }catch(err) {
            console.error("Error deleting completed tasks", err);
        }
    }

    //Pamti selectovani value na filteru
    filterSelect.addEventListener("change", () => {
        const value = filterSelect.value;
        localStorage.setItem("taskFilter", value);
        applyFilter();
    });

    //Funkcija za filter
    function applyFilter() {
        const value = filterSelect.value.toLowerCase();
        const groups = onHoldContainer.querySelectorAll(".task-group");

        groups.forEach(group => {

            const card = group.querySelector(".task-item");

            const status = card.dataset.status;
            const priority = card.dataset.priority;

            let show = false;

            if (["pending", "expired"].includes(value)) {
                show = status === value;
            } 
            else if (["minor", "normal", "critical"].includes(value)) {
                show = priority === value;
            } 
            else {
                show = true;
            }

            group.style.display = show ? "block" : "none";
        });
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

    clearCompletedBtn.addEventListener("click", clearCompletedTasks);


})();