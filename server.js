const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Configuración directa
const pool = new Pool({
    connectionString: 'postgresql://postgres:G21091991_a@db.zvnzvwakatydltdsfggs.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/login', async (req, res) => {
    const { nombre_usuario, contrasena } = req.body;
    try {
        // Consultamos la base de datos
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
        // Este console.log aparecerá en los logs de Render si algo falla
        console.error('ERROR CRÍTICO:', err.message);
        res.status(500).json({ success: false, message: 'Error de conexión: ' + err.message });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 SERVIDOR ACTIVO EN PUERTO ${port}`);
});

