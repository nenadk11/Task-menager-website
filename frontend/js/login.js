const form = document.getElementById("loginForm");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = form.elements["email"].value.trim();
    const password = form.elements["password"].value;

    if(!email || !password){
        alert("All fields are required");
        return;
    }

    //Slanje inputa backendu
    try {
        const res = await fetch("http://localhost:8000/backend/api/auth/login.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if(data.success){
            alert("Login successful");
            window.location.href = "index.html";
        }else{
            alert(data.message || "Login unsuccessful");
        }
    }catch (err) {
        console.error(err);
        alert("Something went wrong. Please try again.");
    }
});