document.addEventListener("DOMContentLoaded", () => {
    const BASE_URL = 'https://mi-servidor-node-8fas.onrender.com';
    const agregarProductoForm = document.getElementById("agregarProductoForm");
    const productosList = document.getElementById("productosList");
    const loadingIndicator = document.getElementById("loadingIndicator");
    const editModal = document.getElementById("edit-modal");
    const closeModal = document.querySelector(".close");
    const guardarEdicionBtn = document.getElementById("guardarEdicionBtn");

    // Función para mostrar/ocultar loading
    function setLoading(loading) {
        loadingIndicator.style.display = loading ? 'block' : 'none';
        productosList.style.display = loading ? 'none' : '';
    }

    // Cargar productos desde la API
    async function cargarProductos() {
        setLoading(true);
        productosList.innerHTML = '<tr><td colspan="5">Cargando productos...</td></tr>';
        
        try {
            const response = await fetch(`${BASE_URL}/api/productos`);
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            productosList.innerHTML = "";

            if (!result.success || !result.data || result.data.length === 0) {
                productosList.innerHTML = `
                    <tr>
                        <td colspan="5" class="no-data">
                            ${result.message || 'No hay productos registrados'}
                        </td>
                    </tr>
                `;
                return;
            }

            result.data.forEach(producto => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${producto.nombre}</td>
                    <td>${producto.descripcion || 'N/A'}</td>
                    <td>$${producto.precio}</td>
                    <td>${producto.stock}</td>
                    <td class="actions">
                        <button class="btn-delete" data-id="${producto.id}">
                            Eliminar
                        </button>
                        <button class="btn-edit" data-id="${producto.id}">
                            Editar
                        </button>
                    </td>
                `;
                productosList.appendChild(row);
            });

            // Agregar event listeners a los botones dinámicos
            document.querySelectorAll('.btn-delete').forEach(btn => {
                btn.addEventListener('click', () => eliminarProducto(btn.dataset.id));
            });
            
            document.querySelectorAll('.btn-edit').forEach(btn => {
                btn.addEventListener('click', () => editarProducto(btn.dataset.id));
            });

        } catch (error) {
            console.error("Error en cargarProductos:", error);
            productosList.innerHTML = `
                <tr>
                    <td colspan="5" class="error">
                        Error al cargar productos: ${error.message}
                    </td>
                </tr>
            `;
        } finally {
            setLoading(false);
        }
    }

    // Agregar producto
    agregarProductoForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const producto = {
            nombre: document.getElementById("nombre").value.trim(),
            descripcion: document.getElementById("descripcion").value.trim(),
            precio: parseFloat(document.getElementById("precio").value),
            stock: parseInt(document.getElementById("stock").value),
            imagen_url: document.getElementById("imagen_url").value.trim()
        };

        if (!producto.nombre || isNaN(producto.precio) || isNaN(producto.stock)) {
            alert("Nombre, precio y stock son obligatorios y deben ser válidos");
            return;
        }

        try {
            const response = await fetch(`${BASE_URL}/api/productos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(producto)
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || "Error al agregar producto");
            }

            alert(`Producto agregado con ID: ${result.id}`);
            agregarProductoForm.reset();
            await cargarProductos();
        } catch (error) {
            console.error("Error al agregar producto:", error);
            alert(`Error: ${error.message}`);
        }
    });

    // Función para eliminar producto (actualizada)
async function eliminarProducto(id) {
    if (!confirm(`¿Eliminar producto ID ${id}?`)) return;
    
    try {
        const response = await fetch(`${BASE_URL}/api/productos/${id}`, {
            method: 'DELETE',
            headers: { 
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        // Verificar primero el estado de la respuesta
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.error || errorData?.message || `Error ${response.status}`);
        }

        const result = await response.json();
        
        alert(result.message || "Producto eliminado");
        await cargarProductos();
    } catch (error) {
        console.error("Error al eliminar:", error);
        alert(`Error al eliminar: ${error.message}`);
    }
}

// Función para editar producto (actualizada)
async function editarProducto(id) {
    try {
        const response = await fetch(`${BASE_URL}/api/productos/${id}`, {
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.error || errorData?.message || `Error ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || result.message || "Error al obtener producto");
        }
        
        // Llenar formulario de edición
        document.getElementById("edit-id").value = result.data.id;
        document.getElementById("edit-nombre").value = result.data.nombre;
        document.getElementById("edit-descripcion").value = result.data.descripcion || '';
        document.getElementById("edit-precio").value = result.data.precio;
        document.getElementById("edit-stock").value = result.data.stock;
        document.getElementById("edit-imagen_url").value = result.data.imagen_url || '';
        
        // Mostrar modal
        editModal.style.display = "block";
    } catch (error) {
        console.error("Error al preparar edición:", error);
        alert(`Error: ${error.message}`);
    }
}
    // Función para guardar edición
    async function guardarEdicion() {
        const id = document.getElementById("edit-id").value;
        const producto = {
            nombre: document.getElementById("edit-nombre").value.trim(),
            descripcion: document.getElementById("edit-descripcion").value.trim(),
            precio: parseFloat(document.getElementById("edit-precio").value),
            stock: parseInt(document.getElementById("edit-stock").value),
            imagen_url: document.getElementById("edit-imagen_url").value.trim()
        };

        try {
            const response = await fetch(`${BASE_URL}/api/productos/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(producto)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Error al actualizar");
            }

            alert("Producto actualizado");
            editModal.style.display = "none";
            await cargarProductos();
        } catch (error) {
            console.error("Error al guardar edición:", error);
            alert(`Error: ${error.message}`);
        }
    }

    // Event listeners
    guardarEdicionBtn.addEventListener('click', guardarEdicion);
    closeModal.onclick = () => editModal.style.display = "none";
    window.onclick = (event) => {
        if (event.target == editModal) {
            editModal.style.display = "none";
        }
    }

    // Cargar productos al iniciar
    cargarProductos();
});
