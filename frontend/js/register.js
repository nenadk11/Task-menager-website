const form = document.getElementById("registerForm");

function setError(id, message) {
    const el = document.getElementById(id);
    el.innerHTML = `<i class="fa-solid fa-circle-info"></i> ${message}`;
}

function clearError() {
    document.querySelectorAll(".error-msg").forEach(el => el.textContent = "");
}

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    clearError();

    const username = form.elements["name"].value.trim();
    const email = form.elements["email"].value.trim();
    const password = form.elements["password"].value;
    const confirmPassword = form.elements["confirmPassword"].value;

    let hasError = false;

    if (!username) {
        setError("usernameError", "Username is required");
        hasError = true;
    }

    if (/\s/.test(username)) {
        setError("usernameError", "Username cannot contain spaces");
        hasError = true;
    }

    if (username.length < 4 || username.length > 20) {
        setError("usernameError", 'Username must be 4-20 characters');
        hasError = true;
    }

    if (!email) {
        setError("emailError", "Email is required");
        hasError = true;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError("emailError", "Enter a valid email address");
        hasError = true;
    }

    if (!password) {
        setError("passwordError", "Password is required");
        hasError = true;
    }

    if (password.length < 8) {
        setError("passwordError", "Password must be at least 8 characters");
        hasError = true;
    }

    if (!confirmPassword) {
        setError("confirmPasswordError", "Confirm password is required");
        hasError = true;
    }

    if (password !== confirmPassword) {
        setError("confirmPasswordError", "Passwords do not match");
        hasError = true;
    }

    if(hasError) return;

    //Slanje inputa backendu
    try {
        const res = await fetch("/backend/api/auth/register.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, email, password, confirmPassword})
        });

        const data = await res.json();

        if (data.success) {
            window.location.href = "login.html";
        } else {
            alert(data.message || "Unsuccessful register");
        }
    } catch (err) {
        console.error(err);
        alert("Something went wrong. Please try again.");
    }
});