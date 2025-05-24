const express = require('express');
const router = express.Router();
const { query } = require('./db');

// Endpoint de prueba
router.get('/test', async (req, res) => {
  try {
    const result = await query('SELECT 1 + 1 AS solution');
    res.json({ 
      success: true,
      data: {
        solution: result[0].solution,
        dbStatus: 'OK'
      }
    });
  } catch (err) {
    console.error('Error en test endpoint:', err);
    res.status(500).json({ 
      success: false,
      error: 'Database connection failed',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Obtener todos los productos
router.get('/', async (req, res) => {
  try {
    const productos = await query(`
      SELECT 
        id,
        nombre,
        descripcion,
        precio,
        stock,
        imagen_url
      FROM productos
      ORDER BY nombre ASC
    `);
    
    res.json({
      success: true,
      count: productos.length,
      data: productos,
      message: productos.length === 0 ? 'No hay productos registrados' : undefined
    });

  } catch (err) {
    console.error('Error en GET /api/productos:', err);
    res.status(500).json({ 
      success: false,
      error: 'Error al obtener productos',
      details: process.env.NODE_ENV === 'development' ? {
        message: err.message,
        code: err.code
      } : undefined
    });
  }
});

// Obtener un producto específico
router.get('/:id', async (req, res) => {
  try {
    const [producto] = await query(
      'SELECT * FROM productos WHERE id = ? LIMIT 1', 
      [req.params.id]
    );
    
    if (!producto) {
      return res.status(404).json({ 
        success: false,
        error: 'Producto no encontrado'
      });
    }

    res.json({
      success: true,
      data: producto
    });

  } catch (err) {
    console.error('Error en GET /api/productos/:id:', err);
    res.status(500).json({ 
      success: false,
      error: 'Error al obtener producto',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Crear nuevo producto
router.post('/', async (req, res) => {
  try {
    const { nombre, descripcion, precio, stock, imagen_url } = req.body;
    
    // Validaciones
    if (!nombre || precio === undefined || stock === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Nombre, precio y stock son requeridos'
      });
    }

    const result = await query(
      `INSERT INTO productos (nombre, descripcion, precio, stock, imagen_url) 
       VALUES (?, ?, ?, ?, ?)`,
      [nombre, descripcion, precio, stock, imagen_url]
    );

    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        nombre,
        precio,
        stock
      },
      message: 'Producto creado exitosamente'
    });

  } catch (err) {
    console.error('Error al crear producto:', err);
    res.status(500).json({
      success: false,
      error: 'Error al crear producto',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Actualizar producto
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, precio, stock, imagen_url } = req.body;
    
    // Validaciones
    if (!nombre || precio === undefined || stock === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Nombre, precio y stock son requeridos'
      });
    }

    // Verificar si el producto existe
    const [existing] = await query(
      'SELECT id FROM productos WHERE id = ? LIMIT 1',
      [id]
    );
    
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      });
    }

    // Actualizar producto
    await query(
      `UPDATE productos 
       SET nombre = ?, descripcion = ?, precio = ?, stock = ?, imagen_url = ?
       WHERE id = ?`,
      [nombre, descripcion, precio, stock, imagen_url, id]
    );

    res.json({
      success: true,
      message: 'Producto actualizado exitosamente'
    });

  } catch (err) {
    console.error('Error al actualizar producto:', err);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar producto',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Eliminar producto
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si el producto existe
    const [existing] = await query(
      'SELECT id FROM productos WHERE id = ? LIMIT 1',
      [id]
    );
    
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      });
    }

    // Eliminar producto
    await query(
      'DELETE FROM productos WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Producto eliminado exitosamente'
    });

  } catch (err) {
    console.error('Error al eliminar producto:', err);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar producto',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;