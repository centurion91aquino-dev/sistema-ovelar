const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Conexión a la Base de Datos
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, '/')));

// --- RUTAS DE PRODUCTOS ---
app.get('/productos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM productos ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/guardar-producto', async (req, res) => {
    const { id, codigo, nombre, precio, stock, imagen_url } = req.body;
    try {
        if (id) {
            await pool.query('UPDATE productos SET codigo=$1, nombre=$2, precio=$3, stock=$4, imagen_url=$5 WHERE id=$6', [codigo, nombre, precio, stock, imagen_url, id]);
        } else {
            await pool.query('INSERT INTO productos (codigo, nombre, precio, stock, imagen_url) VALUES ($1, $2, $3, $4, $5)', [codigo, nombre, precio, stock, imagen_url]);
        }
        res.sendStatus(200);
    } catch (err) { res.status(500).send(err.message); }
});

app.get('/buscar-producto', async (req, res) => {
    try {
        const { term } = req.query;
        const result = await pool.query("SELECT * FROM productos WHERE nombre ILIKE $1 OR codigo ILIKE $1 LIMIT 10", [`%${term}%`]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/eliminar-producto/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM productos WHERE id = $1', [req.params.id]);
        res.sendStatus(200);
    } catch (err) { res.status(500).send(err.message); }
});

// --- RUTA DE VENTAS (CORREGIDA Y SIMPLIFICADA) ---
app.post('/finalizar-venta', async (req, res) => {
    const { cliente, total, carrito } = req.body;
    try {
        // 1. Registrar la venta
        const venta = await pool.query('INSERT INTO ventas (cliente, total) VALUES ($1, $2) RETURNING id', [cliente, total]);
        const ventaId = venta.rows[0].id;

        // 2. Procesar el carrito (Descontar Stock)
        for (const item of carrito) {
            // Actualizamos el stock directamente
            await pool.query('UPDATE productos SET stock = stock - $1 WHERE id = $2', [item.cantidad, item.id]);
        }
        
        res.status(200).json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error en base de datos" });
    }
});

app.get('/historial-ventas', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM ventas ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).send(err.message); }
});

// --- LOGIN ---
app.post('/login', async (req, res) => {
    const { nombre_usuario, contrasena } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE nombre_usuario = $1 AND contrasena = $2', [nombre_usuario, contrasena]);
        res.json({ success: result.rows.length > 0 });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`Servidor en puerto ${PORT}`); });
