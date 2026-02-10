const form = document.getElementById("registerForm");

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    const username = form.elements["name"].value.trim();
    const email = form.elements["email"].value.trim();
    const password = form.elements["password"].value;
    const confirmPassword = form.elements["confirmPassword"].value;

    if (!username || !email || !password) {
        alert("All fields are required");
        return;
    }

    if (/\s/.test(username)) {
        alert("Username cannot contain spaces");
        return;
    }

    if (password !== confirmPassword) {
        alert("Passwords do not match");
        return;
    }

    //Slanje inputa backendu
    try {
        const res = await fetch("http://localhost:8000/backend/api/auth/register.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, email, password, confirmPassword})
        });

        const data = await res.json();

        if (data.success) {
            alert("You registered successfully");
            window.location.href = "login.html";
        } else {
            alert(data.message || "Unsuccessful register");
        }
    } catch (err) {
        console.error(err);
        alert("Something went wrong. Please try again.");
    }
});