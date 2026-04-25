import { checkAuth } from "./auth.js";

const savedTheme = localStorage.getItem("theme");
const themeBtn = document.getElementById("themeToggleBtn");

const aiBtn = document.getElementById("aiInsightsBtn");
const aiBox = document.getElementById("aiInsightsBox");

let aiCooldownInterval = null;

//Zapamti temu sajta
if (themeBtn && savedTheme === "dark") {
    const icon = themeBtn.querySelector("i");

    icon.classList.remove("fa-moon");
    icon.classList.add("fa-sun");

    themeBtn.setAttribute("data-tooltip", "Switch to light mode");
}

function setError(id, message) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = message;
}

//Funkcija za proveru da li je korisnik ulogovan
async function initProfile() {
    const user = await checkAuth();

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    loadProfile();

    if (aiBtn && aiBox) {
        loadAIInsights();
    }
}

initProfile();

//Funkcija za ocitavanje informacija o korisniku
async function loadProfile() {
    const res = await fetch("/backend/api/user/profile.php");
    const data = await res.json();

    if (data.error) {
        console.error(data.error);
        return;
    }

    document.getElementById("profile-info").innerHTML = `
        <p><i class="fa-solid fa-user"></i> ${data.username}</p>
        <p><i class="fa-solid fa-envelope"></i> ${data.email}</p>
    `;
}

//Funkcija za promenu email i/ili username
async function updateProfile() {
    const username = document.getElementById("usernameInput").value.trim();
    const email = document.getElementById("emailInput").value.trim();

    let hasError = false;

    setError("usernameError", "");
    setError("emailError", "");

    if (username) {

        if (/\s/.test(username)) {
            setError("usernameError", "Username cannot contain spaces");
            hasError = true;
        }

        if (username.length < 4 || username.length > 20) {
            setError("usernameError", "Username must be 4-20 characters");
            hasError = true;
        }
    }

    if (email) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError("emailError", "Enter a valid email address");
            hasError = true;
        }
    }

    if (hasError) return;

    if (!username && !email) {
        alert("There are no changes to save");
        return;
    }

    let message = "Are you sure you want to change:\n";

    if (username) {
        message += `- username to "${username}"\n`;
    }

    if (email) {
        message += `- email to "${email}"\n`;
    }

    if (!confirm(message)) return;

    const res = await fetch("/backend/api/user/profile.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            action: "update_profile",
            username: username || null,
            email: email || null
        })
    });

    const data = await res.json();

    if (data.success) {
        alert("Profile updated successfully");

        document.getElementById("usernameInput").value = "";
        document.getElementById("emailInput").value = "";

        loadProfile();
    } else {
        alert(data.error || "Update failed");
    }
}

//Funkcija za promenu sifre
async function changePassword() {
    const current = document.getElementById("currentPassword").value;
    const newPass = document.getElementById("newPassword").value;
    const confirmPass = document.getElementById("confirmPassword").value;

    let hasError = false;

    setError("currentPasswordError", "");
    setError("newPasswordError", "");
    setError("confirmPasswordError", "");

    if (!current) {
        setError("currentPasswordError", "Current password is required");
        hasError = true;
    }

    if (!newPass) {
        setError("newPasswordError", "New password is required");
        hasError = true;
    }

    if (!confirmPass) {
        setError("confirmPasswordError", "Confirm your password");
        hasError = true;
    }

    if (newPass && newPass.length < 8) {
        setError("newPasswordError", "Must be at least 8 characters");
        hasError = true;
    }

    if (newPass && confirmPass && newPass !== confirmPass) {
        setError("confirmPasswordError", "Passwords do not match");
        hasError = true;
    }

    if (current && newPass && current === newPass) {
        setError("newPasswordError", "Must be different from current password");
        hasError = true;
    }

    if (hasError) return;

    if (!confirm("Are you sure you want to change your password?")) return;

    const res = await fetch("/backend/api/user/profile.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            action: "change_password",
            currentPassword: current,
            newPassword: newPass
        })
    });

    const data = await res.json();

    if (data.success) {
        alert("Password changed successfully");

        document.getElementById("currentPassword").value = "";
        document.getElementById("newPassword").value = "";
        document.getElementById("confirmPassword").value = "";

    } else {
        const error = data.error || "Failed to change password";

        setError("currentPasswordError", "");
        setError("newPasswordError", "");
        setError("confirmPasswordError", "");

        if (error.toLowerCase().includes("current")) {
            setError("currentPasswordError", error);
        } else if (error.toLowerCase().includes("different")) {
            setError("newPasswordError", error);
        } else {
            setError("currentPasswordError", error);
        }
    }
}

//Funkcija za zastitu od html injectiona
function escapeHTML(str) {
    return str.replace(/[&<>"']/g, function (m) {
        return ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        })[m];
    });
}

//Funkcija za dobijanje dana do kraja coldown za ai analysis btn
function getDaysLeft(dateStr) {
    const now = new Date();
    const future = new Date(dateStr);

    const diff = future - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

//Funkcija za formatiranje samo dana do isteka coldowna
function formatDaysLeft(ms) {
    const totalDays = Math.ceil(ms / (1000 * 60 * 60 * 24));

    if (totalDays <= 1) return "1 day";
    return `${totalDays} days`;
}

//Funkcija za formatiranje ostatka vremena do kraja coldowna
function formatTimeLeft(ms) {
    const totalSeconds = Math.floor(ms / 1000);

    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    let parts = [];

    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`);
    if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);

    return parts.join(" ");
}

//Funkcija za promenu buttona u zavisnosti od coldowna
function startCooldownTimer(dateStr) {
    const update = () => {
        const now = new Date();
        const target = new Date(dateStr);
        const diff = target - now;

        if (diff <= 0) {
            aiBtn.disabled = false;
            aiBtn.textContent = "Analyze productivity with AI";
            aiBtn.removeAttribute("title");
            aiBtn.removeAttribute("data-tooltip");
            clearInterval(window.aiCooldownInterval);
            return;
        }

        const text = `You can analyze productivity again in ${formatTimeLeft(diff)}`;

        aiBtn.setAttribute("data-tooltip", text);

        aiBtn.textContent = `Available in ${formatDaysLeft(diff)}`;
    };

    update();
    aiCooldownInterval = setInterval(update, 1000);
}

//Funkcija za loadovanje ai analize
async function loadAIInsights() {
    try {
        const res = await fetch("/backend/api/ai/productivity.php");
        const data = await res.json();

        if (data.error) {
            aiBox.innerHTML = `<p>${data.error}</p>`;
            return;
        }

        if (!data.analysis) {
            aiBox.innerHTML = `<p>Click the button to analyze your productivity.</p>`;
            aiBtn.disabled = false;
            aiBtn.textContent = "Analyze productivity with AI";
            return;
        }

        //Prikaz analize
        aiBox.innerHTML = formatAnalysis(escapeHTML(data.analysis));

        if (!data.canUpdate) {
            aiBtn.disabled = true;
            startCooldownTimer(data.nextUpdateAt);
        } else {
            aiBtn.disabled = false;
            aiBtn.textContent = "Update analysis";
        }

    } catch (err) {
        console.error(err);
        aiBox.innerHTML = `<p>Error loading analysis</p>`;
    }
}

function formatAnalysis(text) {
    return text
        .replace(/\n/g, "<br>")
        .replace(/Productivity:/g, "<h3>📈 Productivity</h3>")
        .replace(/Problems:/g, "<h3>⚠️ Problems</h3>")
        .replace(/Habits:/g, "<h3>🔁 Habits</h3>")
        .replace(/Suggestions:/g, "<h3>💡 Suggestions</h3>");
}

//Event delegation za buttone
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

    if (e.target.closest("#saveProfileBtn")) {
        updateProfile();
    }

    if (e.target.closest("#changePasswordBtn")) {
        changePassword();
        return;
    }

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

    //Dugme za Ai analizu
    if (e.target.closest("#aiInsightsBtn")) {

        if (!aiBtn || !aiBox) return;

        if (aiBtn.disabled) return;

        aiBtn.disabled = true;
        aiBtn.textContent = "Analyzing...";
        aiBox.innerHTML = `
            <p>Analyzing your productivity...</p>
            <small>This may take a few seconds</small>
        `;

        try {
            const res = await fetch("/backend/api/ai/productivity.php", {
                method: "POST"
            });

            const data = await res.json();

            if (data.error) {
                aiBox.innerHTML = `<p>${data.error}</p>`;
                aiBtn.disabled = false;
                aiBtn.textContent = "Try again";
                return;
            }

            aiBox.innerHTML = formatAnalysis(escapeHTML(data.analysis));

            aiBtn.disabled = true;
            startCooldownTimer(data.nextUpdateAt);

        } catch (err) {
            console.error(err);
            aiBox.innerHTML = "<p>Error generating analysis</p>";
            aiBtn.disabled = false;
            aiBtn.textContent = "Try again";
        }
    }
});

//Brisanje errora
document.addEventListener("input", (e) => {
    if (e.target.id === "currentPassword") setError("currentPasswordError", "");
    if (e.target.id === "newPassword") setError("newPasswordError", "");
    if (e.target.id === "confirmPassword") setError("confirmPasswordError", "");
    if (e.target.id === "usernameInput") setError("usernameError", "");
    if (e.target.id === "emailInput") setError("emailError", "");
});