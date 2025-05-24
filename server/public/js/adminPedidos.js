document.addEventListener("DOMContentLoaded", () => {
    const BASE_URL = 'http://localhost:3000';
    const pedidosList = document.getElementById("pedidosList");
    const pedidosLoading = document.getElementById("pedidosLoading");
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));

    if (!token || !user || user.rol !== 'admin') {
        window.location.href = "login.html";
        return;
    }

    // Cargar todos los pedidos
    async function cargarPedidos() {
        pedidosLoading.style.display = 'block';
        pedidosList.innerHTML = '<p>Cargando pedidos...</p>';
        
        try {
            const response = await fetch(`${BASE_URL}/api/pedidos`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Error al cargar pedidos: ${response.statusText}`);
            }
            
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message || "Error en la respuesta del servidor");
            }
            
            renderizarPedidos(result.data);
        } catch (error) {
            console.error("Error al cargar pedidos:", error);
            pedidosList.innerHTML = `<p class="error">Error: ${error.message}</p>`;
        } finally {
            pedidosLoading.style.display = 'none';
        }
    }

    // Renderizar lista de pedidos
   function renderizarPedidos(pedidos) {
    pedidosList.innerHTML = "";

    if (pedidos.length === 0) {
        pedidosList.innerHTML = "<p>No hay pedidos registrados</p>";
        return;
    }

    // Agrupar pedidos por día
    const pedidosPorDia = {};
    pedidos.forEach(pedido => {
        // Extrae solo la fecha (YYYY-MM-DD)
        const fecha = new Date(pedido.fecha).toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' });
        if (!pedidosPorDia[fecha]) pedidosPorDia[fecha] = [];
        pedidosPorDia[fecha].push(pedido);
    });

    // Renderizar por día
    Object.keys(pedidosPorDia).sort((a, b) => new Date(b) - new Date(a)).forEach(fecha => {
        // Encabezado del día
        const header = document.createElement("h3");
        header.textContent = fecha;
        header.className = "pedido-dia-header";
        pedidosList.appendChild(header);

        // Pedidos de ese día
        pedidosPorDia[fecha].forEach(pedido => {
            const div = document.createElement("div");
            div.className = "pedido-card";
            // ...tu código para renderizar el pedido...
            // Ejemplo:
            div.innerHTML = `
                <h4>Pedido #${pedido.id}</h4>
                <p>Usuario: ${pedido.usuario_nombre} (${pedido.usuario_email})</p>
                <p>Fecha: ${new Date(pedido.fecha).toLocaleString()}</p>
                <ul class="detalles-pedido">
                    ${pedido.detalles.map(detalle => `
                        <li>
                            <img src="${detalle.imagen_url || 'img/placeholder.png'}" alt="${detalle.producto_nombre}" width="50">
                            ${detalle.producto_nombre} - 
                            ${detalle.cantidad} x $${detalle.precio_unitario} = $${detalle.cantidad * detalle.precio_unitario}
                        </li>
                    `).join("")}
                </ul>
                <p class="total-pedido">Total: $${pedido.detalles.reduce((sum, detalle) => sum + (detalle.cantidad * detalle.precio_unitario), 0)}</p>
                <button class="btn-eliminar-pedido" data-id="${pedido.id}">Eliminar</button>
            `;
            pedidosList.appendChild(div);
        });
    });

    // Eliminar pedido
    document.querySelectorAll('.btn-eliminar-pedido').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (confirm('¿Seguro que deseas eliminar este pedido?')) {
                const pedidoId = btn.dataset.id;
                try {
                    const response = await fetch(`${BASE_URL}/api/pedidos/${pedidoId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    const data = await response.json();
                    if (response.ok) {
                        alert('Pedido eliminado con éxito');
                        await cargarPedidos();
                    } else {
                        throw new Error(data.message || 'Error al eliminar el pedido');
                    }
                } catch (error) {
                    alert('Error: ' + error.message);
                }
            }
        });
    });
}

    // Cargar pedidos al iniciar
    cargarPedidos();
});