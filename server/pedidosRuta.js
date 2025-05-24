const express = require('express');
const router = express.Router();
const db = require('./db');
const jwt = require('jsonwebtoken');
const { DateTime } = require('luxon');

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ success: false, message: 'Token inválido o expirado' });
        req.user = user;
        next();
    });
};

// Middleware para verificar admin
function verificarAdmin(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'Acceso no autorizado' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.rol !== 'admin') {
            return res.status(403).json({ success: false, message: 'Acceso restringido a administradores' });
        }
        next();
    } catch (err) {
        res.status(401).json({ success: false, message: 'Token inválido' });
    }
}

// Obtener pedidos del usuario
router.get('/usuario', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT p.* FROM pedidos p 
            WHERE p.usuario_id = ?
            ORDER BY p.fecha DESC
        `, [req.user.id]);
        const pedidos = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
        
        for (let pedido of pedidos) {
            const detallesResult = await db.query(`
                SELECT pd.*, pr.nombre as producto_nombre, pr.imagen_url 
                FROM pedido_detalles pd
                JOIN productos pr ON pd.producto_id = pr.id
                WHERE pd.pedido_id = ?
            `, [pedido.id]);
            const detalles = Array.isArray(detallesResult) && Array.isArray(detallesResult[0]) ? detallesResult[0] : detallesResult;
            pedido.detalles = detalles;
        }
        
        res.json({ success: true, data: pedidos });
    } catch (err) {
        console.error('Error al obtener pedidos:', err);
        res.status(500).json({ success: false, message: 'Error al obtener pedidos' });
    }
});

// Realizar un pedido (con autenticación)
router.post('/', authenticateToken, async (req, res) => {
    const { productos } = req.body;
    const usuario_id = req.user.id;

    if (!productos || !Array.isArray(productos) || productos.length === 0) {
        return res.status(400).json({ 
            success: false,
            message: "Se requiere un array de productos no vacío" 
        });
    }

    for (const item of productos) {
        if (!item.producto_id || !item.cantidad || item.cantidad <= 0) {
            return res.status(400).json({ 
                success: false,
                message: "Cada producto debe tener producto_id y cantidad positiva" 
            });
        }
    }

    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // Obtener la hora real de Tapachula, México
        const fechaMexico = DateTime.now().setZone('America/Mexico_City').toFormat('yyyy-LL-dd HH:mm:ss');

        const pedidoResult = await connection.execute(
            'INSERT INTO pedidos (usuario_id, fecha) VALUES (?, ?)',
            [usuario_id, fechaMexico]
        );
        const pedido = Array.isArray(pedidoResult) && typeof pedidoResult[0] === 'object' ? pedidoResult[0] : pedidoResult;
        const pedidoId = pedido.insertId;

        for (const item of productos) {
            const { producto_id, cantidad } = item;
            
            const productoResult = await connection.execute(
                `SELECT precio, stock FROM productos WHERE id = ? LIMIT 1`, 
                [producto_id]
            );
            const productoRows = Array.isArray(productoResult) && Array.isArray(productoResult[0]) ? productoResult[0] : productoResult;
            
            if (productoRows.length === 0) {
                throw { 
                    status: 404, 
                    message: `Producto ${producto_id} no encontrado`,
                    producto_id
                };
            }
            
            if (productoRows[0].stock < cantidad) {
                throw { 
                    status: 400, 
                    message: `Stock insuficiente para el producto ${producto_id}`,
                    producto_id,
                    stock_disponible: productoRows[0].stock,
                    cantidad_solicitada: cantidad
                };
            }

            await connection.execute(
                'INSERT INTO pedido_detalles (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
                [pedidoId, producto_id, cantidad, productoRows[0].precio]
            );

            await connection.execute(
                'UPDATE productos SET stock = stock - ? WHERE id = ?',
                [cantidad, producto_id]
            );
        }

        await connection.commit();
        
        const pedidoCompletoResult = await connection.execute(`
            SELECT p.*, pd.producto_id, pd.cantidad, pd.precio_unitario, 
                   pr.nombre as producto_nombre, pr.imagen_url
            FROM pedidos p
            JOIN pedido_detalles pd ON p.id = pd.pedido_id
            JOIN productos pr ON pd.producto_id = pr.id
            WHERE p.id = ?
        `, [pedidoId]);
        const pedidoCompleto = Array.isArray(pedidoCompletoResult) && Array.isArray(pedidoCompletoResult[0]) ? pedidoCompletoResult[0] : pedidoCompletoResult;

        res.status(201).json({ 
            success: true,
            message: 'Pedido realizado con éxito',
            pedido_id: pedidoId,
            data: {
                ...pedidoCompleto[0],
                detalles: pedidoCompleto.map(row => ({
                    producto_id: row.producto_id,
                    cantidad: row.cantidad,
                    precio_unitario: row.precio_unitario,
                    producto_nombre: row.producto_nombre,
                    imagen_url: row.imagen_url
                }))
            }
        });

    } catch (err) {
        if (connection) await connection.rollback();
        
        console.error('Error en pedido:', {
            error: err.message,
            usuario_id,
            productos,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });

        const status = err.status || 500;
        const response = { 
            success: false,
            message: err.message || 'Error al procesar el pedido'
        };

        if (err.producto_id) {
            response.producto_id = err.producto_id;
            if (err.stock_disponible !== undefined) {
                response.stock_disponible = err.stock_disponible;
                response.cantidad_solicitada = err.cantidad_solicitada;
            }
        }

        res.status(status).json(response);
    } finally {
        if (connection) connection.release();
    }
});

// Obtener todos los pedidos (para admin)
router.get('/', verificarAdmin, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT p.*, u.nombre as usuario_nombre, u.email as usuario_email 
            FROM pedidos p
            JOIN usuarios u ON p.usuario_id = u.id
            ORDER BY p.fecha DESC
        `);
        const pedidos = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
        
        const pedidosConDetalles = await Promise.all(pedidos.map(async pedido => {
            const detallesResult = await db.query(`
                SELECT pd.*, p.nombre as producto_nombre, p.imagen_url
                FROM pedido_detalles pd
                JOIN productos p ON pd.producto_id = p.id
                WHERE pd.pedido_id = ?
            `, [pedido.id]);
            const detalles = Array.isArray(detallesResult) && Array.isArray(detallesResult[0]) ? detallesResult[0] : detallesResult;
            return { ...pedido, detalles };
        }));
        
        res.json({ success: true, data: pedidosConDetalles });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Eliminar un pedido (solo admin)
router.delete('/:id', verificarAdmin, async (req, res) => {
    const pedidoId = req.params.id;
    try {
        // Elimina primero los detalles del pedido
        await db.query('DELETE FROM pedido_detalles WHERE pedido_id = ?', [pedidoId]);
        // Luego elimina el pedido principal
        const result = await db.query('DELETE FROM pedidos WHERE id = ?', [pedidoId]);
        const deleteData = Array.isArray(result) && typeof result[0] === 'object' ? result[0] : result;
        if (!deleteData.affectedRows) {
            return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
        }
        res.json({ success: true, message: 'Pedido eliminado con éxito' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
