const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 1. CONEXIÓN A LA BASE DE DATOS
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Servir la página principal
app.use(express.static(path.join(__dirname, '/')));

// --- RUTAS DE PRODUCTOS ---

// Listar todos los productos
app.get('/productos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM productos ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Error al listar: " + err.message });
    }
});

// Guardar o Editar producto
app.post('/guardar-producto', async (req, res) => {
    const { id, codigo, nombre, precio, stock, imagen_url } = req.body;
    try {
        if (id) {
            await pool.query(
                'UPDATE productos SET codigo=$1, nombre=$2, precio=$3, stock=$4, imagen_url=$5 WHERE id=$6',
                [codigo, nombre, precio, stock, imagen_url, id]
            );
        } else {
            await pool.query(
                'INSERT INTO productos (codigo, nombre, precio, stock, imagen_url) VALUES ($1, $2, $3, $4, $5)',
                [codigo, nombre, precio, stock, imagen_url]
            );
        }
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Error al guardar: " + err.message });
    }
});

// Buscador para Ventas
app.get('/buscar-producto', async (req, res) => {
    const { term } = req.query;
    try {
        const result = await pool.query(
            "SELECT * FROM productos WHERE (nombre ILIKE $1 OR codigo ILIKE $1) AND stock > 0 LIMIT 10",
            [`%${term}%`]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Eliminar producto
app.delete('/eliminar-producto/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM productos WHERE id = $1', [req.params.id]);
        res.sendStatus(200);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- RUTA DE VENTAS (MÁXIMA ESTABILIDAD) ---

app.post('/finalizar-venta', async (req, res) => {
    const { cliente, total, carrito } = req.body;
    
    // Iniciamos una transacción para que si algo falla, no se descuente stock a medias
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        // 1. Insertar la venta
        const ventaRes = await client.query(
            'INSERT INTO ventas (cliente, total) VALUES ($1, $2) RETURNING id',
            [cliente || 'Consumidor Final', total]
        );
        const ventaId = ventaRes.rows[0].id;

        // 2. Descontar stock por cada producto en el carrito
        for (const item of carrito) {
            // Verificamos que el producto existe y restamos stock
            const stockRes = await client.query(
                'UPDATE productos SET stock = stock - $1 WHERE id = $2',
                [item.cantidad, item.id]
            );
            
            if (stockRes.rowCount === 0) {
                throw new Error(`El producto con ID ${item.id} no existe.`);
            }
        }

        await client.query('COMMIT');
        res.status(200).json({ success: true });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("DETALLE ERROR VENTA:", err.message);
        res.status(500).json({ error: "Error en BD: " + err.message });
    } finally {
        client.release();
    }
});

// Historial de ventas para Reportes
app.get('/historial-ventas', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM ventas ORDER BY fecha DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- LOGIN ---
app.post('/login', async (req, res) => {
    const { nombre_usuario, contrasena } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM usuarios WHERE nombre_usuario = $1 AND contrasena = $2',
            [nombre_usuario, contrasena]
        );
        res.json({ success: result.rows.length > 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Manejo de cualquier otra ruta
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Iniciar Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
