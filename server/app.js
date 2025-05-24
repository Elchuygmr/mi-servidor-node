require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const productosRuta = require('./productosRuta');
const pedidosRuta = require('./pedidosRuta');
const authRuta = require('./authRuta');

const app = express();

// Configuración CORS más permisiva
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Middleware para parsear JSON
app.use(express.json());

// Middleware para servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Rutas API
app.use('/api/productos', productosRuta);
app.use('/api/pedidos', pedidosRuta);
app.use('/api/auth', authRuta);

// Ruta de prueba
app.get('/api/test', (req, res) => {
  res.json({ status: 'OK', message: 'API funcionando' });
});

// Rutas para HTML (no estrictamente necesarias si usas express.static, pero mantenidas por claridad)
app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/pedidos.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pedidos.html'));
});

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Ruta raíz redirige a login
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor backend en http://localhost:${PORT}`);
});

