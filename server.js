const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Conexión a la Base de Datos (PostgreSQL)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Servir archivos estáticos (HTML)
app.use(express.static(path.join(__dirname, 'public')));

// --- RUTA: LOGIN ---
app.post('/login', async (req, res) => {
    const { nombre_usuario, contrasena } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM usuarios WHERE nombre_usuario = $1 AND contrasena = $2',
            [nombre_usuario, contrasena]
        );
        if (result.rows.length > 0) {
            res.json({ success: true });
        } else {
            res.json({ success: false });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

// --- RUTA: LISTAR PRODUCTOS (Soluciona el "Error al cargar datos") ---
app.get('/productos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM productos ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        console.error("Error al obtener productos:", err);
        res.status(500).json({ error: "No se pudo obtener la lista" });
    }
});

// --- RUTA: GUARDAR O ACTUALIZAR PRODUCTO ---
app.post('/guardar-producto', async (req, res) => {
    const { id, codigo, nombre, precio, stock, imagen_url } = req.body;
    try {
        if (id) {
            // Si tiene ID, actualizamos
            await pool.query(
                'UPDATE productos SET codigo=$1, nombre=$2, precio=$3, stock=$4, imagen_url=$5 WHERE id=$6',
                [codigo, nombre, precio, stock, imagen_url, id]
            );
        } else {
            // Si no tiene ID, creamos uno nuevo
            await pool.query(
                'INSERT INTO productos (codigo, nombre, precio, stock, imagen_url) VALUES ($1, $2, $3, $4, $5)',
                [codigo, nombre, precio, stock, imagen_url]
            );
        }
        res.sendStatus(200);
    } catch (err) {
        console.error("Error al guardar:", err);
        res.status(500).send("Error al procesar producto");
    }
});

// --- RUTA: ELIMINAR PRODUCTO ---
app.delete('/eliminar-producto/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM productos WHERE id = $1', [id]);
        res.sendStatus(200);
    } catch (err) {
        console.error("Error al eliminar:", err);
        res.status(500).send("No se pudo eliminar");
    }
});

// --- RUTAS DE VENTAS Y REPORTES ---
app.get('/buscar-producto', async (req, res) => {
    const { term } = req.query;
    try {
        const result = await pool.query('SELECT * FROM productos WHERE nombre ILIKE $1 OR codigo ILIKE $1 LIMIT 5', [`%${term}%`]);
        res.json(result.rows);
    } catch (err) { res.status(500).send(err); }
});

app.post('/finalizar-venta', async (req, res) => {
    const { cliente, total, carrito } = req.body;
    try {
        const venta = await pool.query('INSERT INTO ventas (cliente, total) VALUES ($1, $2) RETURNING id', [cliente, total]);
        const ventaId = venta.rows[0].id;

        for (const item of carrito) {
            await pool.query('INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio) VALUES ($1, $2, $3, $4)', 
            [ventaId, item.id, item.cantidad, item.precio]);
            // Restar Stock
            await pool.query('UPDATE productos SET stock = stock - $1 WHERE id = $2', [item.cantidad, item.id]);
        }
        res.sendStatus(200);
    } catch (err) { console.error(err); res.status(500).send(err); }
});

app.get('/historial-ventas', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM ventas ORDER BY fecha DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).send(err); }
});

// --- INICIAR SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
