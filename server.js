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

// Servir archivos estáticos desde la raíz
app.use(express.static(path.join(__dirname, '/')));

// --- RUTAS ---

app.post('/login', async (req, res) => {
    const { nombre_usuario, contrasena } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE nombre_usuario = $1 AND contrasena = $2', [nombre_usuario, contrasena]);
        res.json({ success: result.rows.length > 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/productos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM productos ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
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
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.delete('/eliminar-producto/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM productos WHERE id = $1', [req.params.id]);
        res.sendStatus(200);
    } catch (err) {
        res.status(500).send(err.message);
    }
});
// RUTA PARA BUSCAR PRODUCTOS EN VENTAS
app.get('/buscar-producto', async (req, res) => {
    try {
        const { term } = req.query;
        // El ILIKE y los % son los que hacen que encuentre "coca" dentro de "Coca Cola"
        const queryText = "SELECT * FROM productos WHERE nombre ILIKE $1 OR codigo ILIKE $1 LIMIT 10";
        const values = [`%${term}%`];
        const result = await pool.query(queryText, values);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error en el servidor" });
    }
});
app.post('/finalizar-venta', async (req, res) => {
    const { cliente, total, carrito } = req.body;

    try {
        // 1. Guardar la cabecera de la venta
        const nuevaVenta = await pool.query(
            'INSERT INTO ventas (cliente, total) VALUES ($1, $2) RETURNING id',
            [cliente, total]
        );
        const ventaId = nuevaVenta.rows[0].id;

        // 2. Guardar cada producto y DESCONTAR stock
        for (const item of carrito) {
            // Guardar detalle
            await pool.query(
                'INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio) VALUES ($1, $2, $3, $4)',
                [ventaId, item.id, item.cantidad, item.precio]
            );
            // DESCONTAR STOCK (La magia del sistema)
            await pool.query(
                'UPDATE productos SET stock = stock - $1 WHERE id = $2',
                [item.cantidad, item.id]
            );
        }

        res.status(200).json({ success: true, message: "Venta completada" });
    } catch (err) {
        console.error("Error al finalizar venta:", err);
        res.status(500).json({ error: "Fallo en la base de datos" });
    }
});
});

app.get('/historial-ventas', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM ventas ORDER BY fecha DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Ruta comodín para el index
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor en puerto ${PORT}`);
});



