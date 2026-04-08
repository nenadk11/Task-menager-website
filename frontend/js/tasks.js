import { checkAuth } from "./auth.js";

const modal = document.getElementById("taskModal");
const openModalBtn = document.getElementById("openModalBtn");
const cancelBtn = document.querySelector(".btn-secondary");
const taskTitleInput = document.getElementById("taskTitle");
const taskPriorityInput = document.getElementById("taskPriority");
const taskDueDateInput = document.getElementById("taskDueDate");
const subtasksContainer = document.getElementById("subtasksContainer");
const addSubtaskBtn = document.getElementById("addSubtaskBtn");
const bellBtn = document.querySelector(".notification-btn");
const dropdown = document.getElementById("notificationDropdown");

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

//Zapamti temu sajta
const savedTheme = localStorage.getItem("theme");
const themeBtn = document.getElementById("themeToggleBtn");

if (themeBtn && savedTheme === "dark") {
    const icon = themeBtn.querySelector("i");

    icon.classList.remove("fa-moon");
    icon.classList.add("fa-sun");

    themeBtn.setAttribute("data-tooltip", "Switch to light mode");
}



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

    const savedSort = localStorage.getItem(`taskSortMode_${user.id}`);
    if (savedSort && sortModes.includes(savedSort)) {
        currentSort = savedSort;
    }

    const savedFilter = localStorage.getItem(`taskFilter_${user.id}`);
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

    //Ai generacija subtaskova logika
    const aiBtn = document.getElementById("aiSubtasksBtn");
    if(aiBtn){
        aiBtn.addEventListener("click", async () => {
            const title = taskTitleInput.value.trim();

            if(!title){
                alert("Enter task title first");
                return;
            }

            if(subtasksContainer.children.length > 0){
                if(!confirm("Replace existing subtasks with AI suggestions?")){
                    return;
                }

                subtasksContainer.innerHTML = "";
            }

            aiBtn.disabled = true;
            aiBtn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Generating...`;

            try{

                const res = await fetch("/backend/api/ai/subtasks.php", {
                    method:"POST",
                    headers:{
                        "Content-Type":"application/json"
                    },
                    body: JSON.stringify({
                        task: title
                    })
                });

                const data = await res.json();
                subtasksContainer.innerHTML = "";

                data.slice(0,5).forEach(text => {

                    const wrapper = document.createElement("div");
                    wrapper.classList.add("subtask-row");

                    wrapper.innerHTML = `
                        <input type="text" class="subtask-input" value="${text}">
                        <button type="button" class="remove-subtask">✕</button>
                    `;

                    wrapper.querySelector(".remove-subtask").onclick = () => wrapper.remove();

                    subtasksContainer.appendChild(wrapper);
                });

            }catch(err){
                console.error("AI error:", err);
            }

            aiBtn.disabled = false;
            aiBtn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Generate subtasks with AI`;

        });
    }

    //Pamti sort koji je bio
    sortBtn.addEventListener("click", () => {
        const currentIndex = sortModes.indexOf(currentSort);
        const nextIndex = (currentIndex + 1) % sortModes.length;

        currentSort = sortModes[nextIndex];

        localStorage.setItem(`taskSortMode_${user.id}`, currentSort);

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

    //Funkcija za skrol i fokus na task iz notifikacija
    function scrollToTask(taskId){
        const el = document.querySelector(`.task-item[data-id="${taskId}"]`);

        if(!el) return;

        el.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

        //highlight efekat
        el.classList.add("highlight-task");

        setTimeout(() => {
            el.classList.remove("highlight-task");
        }, 1500);
    }
    
    async function loadNotifications(){
        try{
            const res = await fetch("/backend/api/notifications/notifications.php");
            const notifications = await res.json();

            renderNotificationsFromDB(notifications);

        }catch(err){
            console.error("Error loading notifications:", err);
        }
    }

    function renderNotificationsFromDB(notifications){
        const badge = document.querySelector(".notification-badge");
        const dropdown = document.getElementById("notificationDropdown");

        if(!badge || !dropdown) return;

        dropdown.innerHTML = "";

        const unread = notifications;

        if(unread.length > 0){
            badge.textContent = unread.length;
            badge.classList.add("show");

            unread.forEach(n => {
                const div = document.createElement("div");
                div.className = "notification-item";

                div.innerHTML = `
                    <span>${n.message}</span>
                    <a href="#" class="notif-link">Show</a>
                `;

                div.querySelector(".notif-link").addEventListener("click", async (e) => {
                    e.preventDefault();

                    scrollToTask(n.task_id);
                    dropdown.classList.remove("show");

                    //Obrisi notifikaciju
                    await fetch("/backend/api/notifications/notifications.php", {
                        method:"POST",
                        headers:{ "Content-Type":"application/json" },
                        body: JSON.stringify({
                            action: "delete",
                            id: n.id
                        })
                    });

                    await loadNotifications();
                });

                dropdown.appendChild(div);

            });

            //Dodaj clear all dugme ako ima 2 ili vise notifikacije
            if(unread.length >= 2){
                const clearBtn = document.createElement("div");
                clearBtn.className = "notification-clear-all";
                clearBtn.textContent = "Clear all notifications";

                clearBtn.addEventListener("click", async () => {

                    await fetch("/backend/api/notifications/notifications.php", {
                        method:"POST",
                        headers:{ "Content-Type":"application/json" },
                        body: JSON.stringify({
                            action: "delete_all"
                        })
                    });

                    await loadNotifications();
                });

                dropdown.appendChild(clearBtn);
            }

        }else{
            badge.classList.remove("show");

            const empty = document.createElement("div");
            empty.className = "notification-empty";
            empty.textContent = "You have no notifications";

            dropdown.appendChild(empty);
        }
    }

    //GET - za ucitavanje taskova iz backenda
    async function loadTasks() {

        try {
            const res = await fetch("/backend/api/tasks/tasks.php");
            const tasks = await res.json();

            onHoldContainer.innerHTML = "";
            completedContainer.innerHTML = "";

            console.log("loadTasks called");
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

                    <button class="icon-btn2 edit-btn" style="width:35px;height:35px;">
                        <i class="fas fa-pen"></i>
                    </button>

                    <button class="icon-btn2 delete-btn" style="width:35px;height:35px;">
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

            loadNotifications();
        } catch (err) {
            console.error("Error loading tasks:", err);
        }       
    }

    //Event delegation
    document.addEventListener("click", async (e) => {

        //Dugme za promenu teme sajta
        if (e.target.closest("#themeToggleBtn")) {
            const btn = e.target.closest("#themeToggleBtn");
            const icon = btn.querySelector("i");

            document.documentElement.classList.toggle("dark-mode");

            const isDark = document.documentElement.classList.contains("dark-mode");

            icon.classList.toggle("fa-moon", !isDark);
            icon.classList.toggle("fa-sun", isDark);

            btn.setAttribute(
                "data-tooltip",
                isDark ? "Switch to light mode" : "Switch to dark mode"
            );

            localStorage.setItem("theme", isDark ? "dark" : "light");
        }

        //Notifikacije ugasi ako klikne napolje
        if (dropdown && bellBtn) {
            const isClickInsideDropdown = dropdown.contains(e.target);
            const isClickOnBell = bellBtn.contains(e.target);

            if (!isClickInsideDropdown && !isClickOnBell) {
                dropdown.classList.remove("show");
            }
        }

        //Prikazi notifikacije ako klikne na dugme
        if (e.target.closest(".notification-btn")) {
            dropdown.classList.toggle("show");
            return;
        }

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

        //Log out dugme
        if (e.target.closest("#logoutBtn")) {

            if (!confirm("Are you sure you want to sign out?")) return;

            const res = await fetch("/backend/api/auth/logout.php", {
                method: "POST"
            });

            const data = await res.json();

            if (data.success) {
                window.location.href = "login.html";
            } else {
                alert("Logout failed");
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
        localStorage.setItem(`taskFilter_${user.id}`, value);
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