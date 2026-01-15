const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

const connectionString = 'postgresql://postgres.zvnzvwakatydltdsfggs:Ovelar26202026@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(express.static(__dirname));

// --- RUTAS ---

app.post('/login', async (req, res) => {
    const { nombre_usuario, contrasena } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE nombre_usuario = $1 AND contrasena = $2', [nombre_usuario, contrasena]);
        res.json({ success: result.rows.length > 0 });
    } catch (err) { res.status(500).json({ success: false }); }
});

// LISTAR TODOS LOS PRODUCTOS
app.get('/productos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM productos ORDER BY nombre ASC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GUARDAR O ACTUALIZAR PRODUCTO
app.post('/guardar-producto', async (req, res) => {
    const { codigo, nombre, precio, stock } = req.body;
    try {
        await pool.query(
            `INSERT INTO productos (codigo, nombre, precio, stock) 
             VALUES ($1, $2, $3, $4) 
             ON CONFLICT (codigo) DO UPDATE 
             SET nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, stock = EXCLUDED.stock`,
            [codigo, nombre, precio, stock]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/buscar-producto', async (req, res) => {
    const term = req.query.term;
    const result = await pool.query("SELECT * FROM productos WHERE nombre ILIKE $1 OR codigo ILIKE $1 LIMIT 5", [`%${term}%`]);
    res.json(result.rows);
});

app.get('/buscar-cliente', async (req, res) => {
    const term = req.query.term;
    const result = await pool.query("SELECT * FROM clientes WHERE nombre ILIKE $1 OR ruc_cedula ILIKE $1 LIMIT 5", [`%${term}%`]);
    res.json(result.rows);
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(port, '0.0.0.0', () => console.log(`🚀 SISTEMA OVELAR V2 EN MARCHA`));
