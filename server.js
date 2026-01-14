const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Configuración de conexión (Transaction Pooler)
const connectionString = 'postgresql://postgres.zvnzvwakatydltdsfggs:Ovelar26202026@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(express.static(__dirname));

// --- RUTAS DEL SISTEMA ---

// 1. Login
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
            res.json({ success: false, message: 'Usuario o clave incorrecta' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 2. Buscador de Productos (Busca por nombre o código)
app.get('/buscar-producto', async (req, res) => {
    const term = req.query.term;
    try {
        const result = await pool.query(
            "SELECT * FROM productos WHERE nombre ILIKE $1 OR codigo ILIKE $1 LIMIT 5",
            [`%${term}%`]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Buscador de Clientes (Busca por nombre o RUC)
app.get('/buscar-cliente', async (req, res) => {
    const term = req.query.term;
    try {
        const result = await pool.query(
            "SELECT * FROM clientes WHERE nombre ILIKE $1 OR ruc_cedula ILIKE $1 LIMIT 5",
            [`%${term}%`]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 SERVIDOR VENTAS ONLINE EN PUERTO ${port}`);
});
