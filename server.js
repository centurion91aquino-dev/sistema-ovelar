const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// URL ACTUALIZADA CON TU NUEVA CLAVE Y MODO TRANSACCIÓN
const connectionString = 'postgresql://postgres.zvnzvwakatydltdsfggs:Ovelar26202026@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000
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
        console.error('ERROR:', err.message);
        res.status(500).json({ success: false, message: 'Error de acceso: ' + err.message });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 SISTEMA OVELAR - LISTO CON NUEVA CLAVE`);
});
