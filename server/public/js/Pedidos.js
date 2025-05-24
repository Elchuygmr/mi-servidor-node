document.addEventListener("DOMContentLoaded", () => {
    const BASE_URL = 'https://mi-servidor-node-8fas.onrender.com';
    const pedidoForm = document.getElementById("pedidoForm");
    const productosContainer = document.getElementById("productosContainer");
    const listaPedido = document.getElementById("listaPedido");
    const totalElement = document.getElementById("total");
    const stockList = document.getElementById("stockList");
    const userGreeting = document.getElementById("userGreeting");
    const pedidosUsuarioContainer = document.getElementById("pedidosUsuario");
    const logoutBtn = document.getElementById("logoutBtn");
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));
    
    if (!token || !user) {
        window.location.href = "login.html";
        return;
    }
    
    let productos = [];
    let pedido = [];
    let total = 0;

    // Mostrar información del usuario
    userGreeting.textContent = `Hola, ${user.nombre}`;
    
    // Configurar botón de logout
    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "login.html";
    });

    // Cargar productos desde la API
    async function cargarProductos() {
        try {
            const response = await fetch(`${BASE_URL}/api/productos`);
            if (!response.ok) throw new Error(`Error al cargar productos: ${response.statusText}`);

            const result = await response.json();
            if (!result.success) throw new Error(result.message || "Error en la respuesta del servidor");
            
            productos = result.data || [];
            renderizarProductos();
            actualizarStockList();
        } catch (error) {
            console.error("Error al cargar productos:", error);
            alert("Error al cargar productos. Revisa la consola.");
        }
    }

    // Cargar pedidos del usuario
    async function cargarPedidosUsuario() {
        try {
            const response = await fetch(`${BASE_URL}/api/pedidos/usuario`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            
            if (!response.ok) throw new Error(`Error al cargar pedidos: ${response.statusText}`);
            
            const result = await response.json();
            if (!result.success) throw new Error(result.message || "Error en la respuesta del servidor");
            
            renderizarPedidosUsuario(result.data);
        } catch (error) {
            console.error("Error al cargar pedidos:", error);
        }
    }

    // Renderizar lista de pedidos del usuario
    function renderizarPedidosUsuario(pedidos) {
        pedidosUsuarioContainer.innerHTML = "";
        
        if (pedidos.length === 0) {
            pedidosUsuarioContainer.innerHTML = "<p>No tienes pedidos realizados</p>";
            return;
        }

        pedidos.forEach(pedido => {
            const div = document.createElement("div");
            div.className = "pedido-card";
    // mostrar la hora de Tapachula
    const fechaTapachula = luxon.DateTime.fromISO(pedido.fecha, { zone: 'utc' })
        .setZone('America/Mexico_City')
        .toLocaleString(luxon.DateTime.DATETIME_MED_WITH_SECONDS);

    div.innerHTML = `
        <h4>Pedido #${pedido.id}</h4>
        <p>Fecha: ${fechaTapachula}</p>
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
    `;
    pedidosUsuarioContainer.appendChild(div);
});
    }

    // Renderizar lista de productos disponibles
    function renderizarProductos() {
        productosContainer.innerHTML = "";
        productos.forEach(producto => {
            const div = document.createElement("div");
            div.className = "producto-card";
            div.innerHTML = `
                ${producto.imagen_url ? `<img src="${producto.imagen_url}" alt="${producto.nombre}" class="producto-imagen">` : ''}
                <h3>${producto.nombre}</h3>
                ${producto.descripcion ? `<p>${producto.descripcion}</p>` : ''}
                <p>Precio: $${producto.precio}</p>
                <p>Stock: ${producto.stock}</p>
                <div class="cantidad-control">
                    <input type="number" id="cantidad-${producto.id}" min="1" max="${producto.stock}" value="1">
                    <button data-id="${producto.id}" class="btn-agregar">Agregar</button>
                </div>
            `;
            productosContainer.appendChild(div);
        });

        // Agregar event listeners a los botones de agregar
        document.querySelectorAll('.btn-agregar').forEach(btn => {
            btn.addEventListener('click', () => agregarAlPedido(btn.dataset.id));
        });
    }

    // Actualizar lista de stock
    function actualizarStockList() {
        stockList.innerHTML = "";
        productos.forEach(producto => {
            let listItem = document.createElement("li");
            listItem.innerHTML = `
                ${producto.imagen_url ? `<img src="${producto.imagen_url}" alt="${producto.nombre}" width="30">` : ''}
                ${producto.nombre}: ${producto.stock} disponibles - $${producto.precio}
            `;
            stockList.appendChild(listItem);
        });
    }

    // Agregar producto al pedido
    function agregarAlPedido(productoId) {
        const cantidadInput = document.getElementById(`cantidad-${productoId}`);
        const cantidad = parseInt(cantidadInput.value);
        
        const producto = productos.find(p => p.id == productoId);
        if (!producto) return;
        
        // Verificar stock
        if (cantidad > producto.stock) {
            alert("No hay suficiente stock disponible");
            return;
        }
        
        // Agregar al pedido
        const itemExistente = pedido.find(item => item.producto_id == productoId);
        if (itemExistente) {
            itemExistente.cantidad += cantidad;
        } else {
            pedido.push({
                producto_id: productoId,
                nombre: producto.nombre,
                precio: producto.precio,
                cantidad: cantidad,
                imagen_url: producto.imagen_url
            });
        }
        
        // Actualizar UI
        actualizarListaPedido();
    }

    // Actualizar lista del pedido
    function actualizarListaPedido() {
        listaPedido.innerHTML = "";
        total = 0;
        
        pedido.forEach(item => {
            const subtotal = item.precio * item.cantidad;
            total += subtotal;
            
            const li = document.createElement("li");
            li.innerHTML = `
                ${item.imagen_url ? `<img src="${item.imagen_url}" alt="${item.nombre}" width="50">` : ''}
                ${item.nombre} - 
                Cantidad: ${item.cantidad} - 
                $${item.precio} c/u - 
                Subtotal: $${subtotal}
                <button data-id="${item.producto_id}" class="btn-remover-one">➖ Quitar 1</button>
                <button data-id="${item.producto_id}" class="btn-remover-all">🗑️ Eliminar</button>
            `;
            listaPedido.appendChild(li);
        });
        
        // Event listeners para botones de quitar 1
        document.querySelectorAll('.btn-remover-one').forEach(btn => {
            btn.addEventListener('click', () => {
                const productoId = btn.dataset.id;
                const itemIndex = pedido.findIndex(item => item.producto_id == productoId);
                if (itemIndex !== -1) {
                    pedido[itemIndex].cantidad -= 1;
                    if (pedido[itemIndex].cantidad <= 0) {
                        pedido.splice(itemIndex, 1);
                    }
                    actualizarListaPedido();
                }
            });
        });
        
        // Event listeners para botones de eliminar todo
        document.querySelectorAll('.btn-remover-all').forEach(btn => {
            btn.addEventListener('click', () => {
                const productoId = btn.dataset.id;
                pedido = pedido.filter(item => item.producto_id != productoId);
                actualizarListaPedido();
            });
        });
        
        totalElement.textContent = `Total: $${total}`;
    }

    // Enviar pedido
    pedidoForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        
        if (pedido.length === 0) {
            alert("No hay productos en el pedido");
            return;
        }
        
        try {
            const response = await fetch(`${BASE_URL}/api/pedidos`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    productos: pedido.map(item => ({
                        producto_id: item.producto_id,
                        cantidad: item.cantidad
                    }))
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert(`Pedido realizado con éxito. Número de pedido: ${data.pedido_id}`);
                pedido = [];
                actualizarListaPedido();
                await cargarProductos(); // Actualizar stock
                await cargarPedidosUsuario(); // Actualizar historial
            } else {
                throw new Error(data.message || "Error al realizar el pedido");
            }
        } catch (error) {
            console.error("Error en la solicitud:", error);
            alert("Error en la solicitud: " + error.message);
        }
    });

    // Cargar datos iniciales
    cargarProductos();
    cargarPedidosUsuario();
});
