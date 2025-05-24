document.addEventListener("DOMContentLoaded", () => {
    const BASE_URL = 'http://localhost:3000';
    const agregarUsuarioForm = document.getElementById("agregarUsuarioForm");
    const usuariosList = document.getElementById("usuariosList");
    const usuariosLoading = document.getElementById("usuariosLoading");
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));

    if (!token || !user || user.rol !== 'admin') {
        window.location.href = "login.html";
        return;
    }

    // Cargar usuarios
    async function cargarUsuarios() {
        usuariosLoading.style.display = 'block';
        usuariosList.innerHTML = '<tr><td colspan="4">Cargando usuarios...</td></tr>';
        
        try {
            const response = await fetch(`${BASE_URL}/api/auth/users`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Error al cargar usuarios");
            }

            usuariosList.innerHTML = "";

            if (!result.data || result.data.length === 0) {
                usuariosList.innerHTML = '<tr><td colspan="4">No hay usuarios registrados</td></tr>';
                return;
            }

            result.data.forEach(usuario => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${usuario.nombre}</td>
                    <td>${usuario.email}</td>
                    <td>${usuario.rol}</td>
                    <td class="actions">
                        <button class="btn-delete-user" data-id="${usuario.id}">
                            Eliminar
                        </button>
                    </td>
                `;
                usuariosList.appendChild(row);
            });

            // Agregar event listeners a los botones de eliminar
            document.querySelectorAll('.btn-delete-user').forEach(btn => {
                btn.addEventListener('click', () => eliminarUsuario(btn.dataset.id));
            });

        } catch (error) {
            console.error("Error al cargar usuarios:", error);
            usuariosList.innerHTML = `<tr><td colspan="4">Error: ${error.message}</td></tr>`;
        } finally {
            usuariosLoading.style.display = 'none';
        }
    }

    // Agregar usuario
    agregarUsuarioForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const usuario = {
            nombre: document.getElementById("usuarioNombre").value.trim(),
            email: document.getElementById("usuarioEmail").value.trim(),
            password: document.getElementById("usuarioPassword").value,
            rol: document.getElementById("usuarioRol").value
        };

        try {
            const response = await fetch(`${BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(usuario)
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || "Error al agregar usuario");
            }

            alert("Usuario agregado con éxito");
            agregarUsuarioForm.reset();
            await cargarUsuarios();
        } catch (error) {
            console.error("Error al agregar usuario:", error);
            alert(`Error: ${error.message}`);
        }
    });

    // Eliminar usuario
    async function eliminarUsuario(id) {
        if (!confirm(`¿Eliminar usuario ID ${id}?`)) return;
        
        try {
            const response = await fetch(`${BASE_URL}/api/auth/users/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Error al eliminar usuario");
            }

            alert("Usuario eliminado con éxito");
            await cargarUsuarios();
        } catch (error) {
            console.error("Error al eliminar usuario:", error);
            alert(`Error: ${error.message}`);
        }
    }

    // Cargar usuarios al iniciar
    cargarUsuarios();
});