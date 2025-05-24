document.addEventListener("DOMContentLoaded", () => {
    const BASE_URL = ''; // usa rutas relativas para funcionar desde el mismo servidor
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const tabBtns = document.querySelectorAll(".tab-btn");
    const adminRegisterFields = document.getElementById("adminRegisterFields");

    // Mostrar campos de registro para admin si está logueado como admin
    const token = localStorage.getItem("token");
    if (token) {
        const user = JSON.parse(localStorage.getItem("user"));
        if (user && user.rol === 'admin') {
            adminRegisterFields.style.display = 'block';
        }
    }

    // Manejar cambio de pestañas
    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
            
            const tabId = btn.dataset.tab;
            btn.classList.add("active");
            document.getElementById(tabId).classList.add("active");
        });
    });
    
// Iniciar sesión
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    try {
        const response = await fetch(`/api/auth/login`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || `Error ${response.status}: ${response.statusText}`);
        }

        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        window.location.href = data.redirectTo;
    } catch (error) {
        console.error("Error en login:", error);
        alert(error.message || "Error al iniciar sesión. Verifica tus credenciales.");
    }
});
    // Registrarse
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("registerName").value;
        const email = document.getElementById("registerEmail").value;
        const password = document.getElementById("registerPassword").value;
        const confirmPassword = document.getElementById("registerConfirmPassword").value;
        const rol = document.getElementById("registerRol")?.value || 'ventas';

        if (password !== confirmPassword) {
            alert("Las contraseñas no coinciden");
            return;
        }

        try {
            const response = await fetch(`/api/auth/register`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ nombre: name, email, password, rol })
            });

            const data = await response.json();

            if (response.ok) {
                alert("Registro exitoso. Por favor inicie sesión.");
                document.querySelector(".tab-btn[data-tab='login']").click();
                registerForm.reset();
            } else {
                throw new Error(data.message || "Error al registrarse");
            }
        } catch (error) {
            alert(error.message);
        }
    });
});
