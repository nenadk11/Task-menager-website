import { checkAuth } from "./auth.js";

function setError(id, message) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = message;
}

//Funkcija za proveru da li je korisnik ulogovan
async function initProfile() {
    const user = await checkAuth();

    if (!user) {
        window.location.href = "/login.html";
        return;
    }

    loadProfile();
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

//Event delegation za buttone
document.addEventListener("click", async (e) => {
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
});

//Brisanje errora
document.addEventListener("input", (e) => {
    if (e.target.id === "currentPassword") setError("currentPasswordError", "");
    if (e.target.id === "newPassword") setError("newPasswordError", "");
    if (e.target.id === "confirmPassword") setError("confirmPasswordError", "");
    if (e.target.id === "usernameInput") setError("usernameError", "");
    if (e.target.id === "emailInput") setError("emailError", "");
});