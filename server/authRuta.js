const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');

// Función auxiliar para manejar errores de la base de datos
const handleDbError = (res, err, operation) => {
    console.error(`Error en ${operation}:`, err);
    res.status(500).json({ 
        success: false, 
        message: `Error en el servidor al ${operation}`,
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
};

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
        const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
        if (!rows || rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Usuario no encontrado' 
            });
        }
        const user = rows[0];
        const validPass = await bcrypt.compare(password, user.password);
        if (!validPass) {
            return res.status(401).json({ 
                success: false, 
                message: 'Credenciales inválidas' 
            });
        }
        const token = jwt.sign(
            { id: user.id, rol: user.rol }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }
        );
        res.json({ 
            success: true, 
            token, 
            user: { 
                id: user.id, 
                nombre: user.nombre, 
                email: user.email, 
                rol: user.rol 
            },
            redirectTo: user.rol === 'admin' ? 'admin.html' : 'pedidos.html'
        });
    } catch (err) {
        handleDbError(res, err, 'iniciar sesión');
    }
});

router.post('/register', async (req, res) => {
    const { nombre, email, password, rol = 'ventas' } = req.body;
    try {
        if (!nombre || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Nombre, email y contraseña son requeridos',
                details: {
                    nombre: !nombre ? 'Requerido' : undefined,
                    email: !email ? 'Requerido' : undefined,
                    password: !password ? 'Requerido' : undefined
                }
            });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Formato de email inválido'
            });
        }
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'La contraseña debe tener al menos 6 caracteres'
            });
        }
        // Verificación de admin para roles de admin
        if (rol === 'admin') {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Se requiere autenticación para registrar administradores' 
                });
            }
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const adminResult = await db.query('SELECT * FROM usuarios WHERE id = ?', [decoded.id]);
                const adminRows = Array.isArray(adminResult) && Array.isArray(adminResult[0]) ? adminResult[0] : adminResult;
                if (!adminRows || adminRows.length === 0 || adminRows[0].rol !== 'admin') {
                    return res.status(403).json({ 
                        success: false, 
                        message: 'No tienes permisos para registrar administradores' 
                    });
                }
            } catch (jwtError) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Token inválido o expirado' 
                });
            }
        }
        // Verificar email único
        const result = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
        const existingRows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
        if (existingRows && existingRows.length > 0) {
            return res.status(409).json({ 
                success: false, 
                message: 'El email ya está registrado' 
            });
        }
        // Crear usuario
        const hashedPass = await bcrypt.hash(password, 10);
        const insertResult = await db.query(
            'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
            [nombre, email, hashedPass, rol]
        );
        const insertData = Array.isArray(insertResult) && typeof insertResult[0] === 'object' ? insertResult[0] : insertResult;
        if (!insertData.insertId) {
            throw new Error('No se pudo crear el usuario');
        }
        res.status(201).json({ 
            success: true, 
            message: 'Usuario registrado con éxito',
            userId: insertData.insertId 
        });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'El email ya está registrado'
            });
        }
        handleDbError(res, err, 'registrar usuario');
    }
});

// Rutas de administración (solo para admins)
const adminAuth = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Autenticación requerida' 
        });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const result = await db.query('SELECT rol FROM usuarios WHERE id = ?', [decoded.id]);
        const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
        if (!rows || rows.length === 0 || rows[0].rol !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Acceso restringido a administradores' 
            });
        }
        req.user = decoded;
        next();
    } catch (err) {
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Token inválido' 
            });
        }
        handleDbError(res, err, 'verificar autenticación');
    }
};

router.get('/users', adminAuth, async (req, res) => {
    try {
        const result = await db.query('SELECT id, nombre, email, rol FROM usuarios');
        const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
        res.json({ 
            success: true, 
            data: rows || [] 
        });
    } catch (err) {
        handleDbError(res, err, 'listar usuarios');
    }
});

router.delete('/users/:id', adminAuth, async (req, res) => {
    try {
        const userId = req.params.id;
        if (req.user.id == userId) {
            return res.status(400).json({
                success: false,
                message: 'No puedes eliminarte a ti mismo'
            });
        }
        const result = await db.query('DELETE FROM usuarios WHERE id = ?', [userId]);
        const deleteData = Array.isArray(result) && typeof result[0] === 'object' ? result[0] : result;
        if (!deleteData.affectedRows) {
            return res.status(404).json({ 
                success: false, 
                message: 'Usuario no encontrado' 
            });
        }
        res.json({ 
            success: true, 
            message: 'Usuario eliminado con éxito' 
        });
    } catch (err) {
        handleDbError(res, err, 'eliminar usuario');
    }
});

module.exports = router;