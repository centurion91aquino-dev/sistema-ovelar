const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// FORZAMOS IP V4 DIRECTA PARA EVITAR ENETUNREACH
const pool = new Pool({
    user: 'postgres',
    host: '54.144.151.107', // Esta es la IP directa de tu servidor en Supabase
    database: 'postgres',
    password: 'G21091991_a', 
    port: 6543, // Usamos el puerto de Transacción que configuraste
    ssl: {
        rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000
});

app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/login', async (req, res) => {
    const { nombre_usuario, contrasena } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM usuarios WHERE nombre_usuario = $1 AND contrasena = $2',
            [nombre_usuario, contrasena]
        );
        if (result.rows.length > 0) {
            res.json({ success: true, user: result.rows[0] });
        } else {
            res.json({ success: false, message: 'Usuario o clave incorrecta' });
        }
    } catch (err) {
        console.error('DETALLE:', err.message);
        res.status(500).json({ success: false, message: 'Error final: ' + err.message });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 SISTEMA OVELAR FORZANDO IPV4`);
});
