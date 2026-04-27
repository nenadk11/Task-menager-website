const form = document.getElementById("loginForm");
const currentTheme = localStorage.getItem("theme");
const themeBtn = document.getElementById("themeToggleBtn");

if (themeBtn && currentTheme === "dark") {
    const icon = themeBtn.querySelector("i");

    icon.classList.remove("fa-moon");
    icon.classList.add("fa-sun");

    themeBtn.setAttribute("data-tooltip", "Switch to light mode");
}

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

    const email = form.elements["email"].value.trim();
    const password = form.elements["password"].value;

    let hasError = false;

    if(!email){
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

    //Slanje inputa backendu
    try {
        const res = await fetch("/backend/api/auth/login.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if(data.success){
            window.location.href = "index.html";
        }else{
            alert(data.message || "Login unsuccessful");
        }
    }catch (err) {
        console.error(err);
        alert("Something went wrong. Please try again.");
    }
});

themeBtn?.addEventListener("click", () => {
    const icon = themeBtn.querySelector("i");

    document.documentElement.classList.toggle("dark-mode");

    const isDark = document.documentElement.classList.contains("dark-mode");

    icon.classList.toggle("fa-moon", !isDark);
    icon.classList.toggle("fa-sun", isDark);

    themeBtn.setAttribute(
        "data-tooltip",
        isDark ? "Switch to light mode" : "Switch to dark mode"
    );

    localStorage.setItem("theme", isDark ? "dark" : "light");
});