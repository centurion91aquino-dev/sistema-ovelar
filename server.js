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

// ... (Mantén tu configuración de Pool arriba)

// GUARDAR PRODUCTO CON IMAGEN
app.post('/guardar-producto', async (req, res) => {
    const { codigo, nombre, precio, stock, imagen_url } = req.body;
    try {
        await pool.query(
            `INSERT INTO productos (codigo, nombre, precio, stock, imagen_url) 
             VALUES ($1, $2, $3, $4, $5) 
             ON CONFLICT (codigo) DO UPDATE 
             SET nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, stock = EXCLUDED.stock, imagen_url = EXCLUDED.imagen_url`,
            [codigo, nombre, precio, stock, imagen_url]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});
// 1. RUTA PARA LISTAR PRODUCTOS (¡Esta es la que hace que la lista se vea!)
app.get('/productos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM productos ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        console.error("Error en GET /productos:", err);
        res.status(500).send("Error del servidor");
    }
});

// 2. RUTA PARA ELIMINAR PRODUCTOS
app.delete('/eliminar-producto/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM productos WHERE id = $1', [id]);
        res.sendStatus(200);
    } catch (err) {
        console.error("Error en DELETE /eliminar-producto:", err);
        res.status(500).send("Error del servidor");
    }
});
});
// FINALIZAR VENTA Y RESTAR STOCK
app.post('/finalizar-venta', async (req, res) => {
    const { cliente, carrito, total } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const ventaRes = await client.query('INSERT INTO ventas (cliente_nombre, total) VALUES ($1, $2) RETURNING id', [cliente, total]);
        const ventaId = ventaRes.rows[0].id;

        for (let item of carrito) {
            // Insertar detalle
            await client.query('INSERT INTO ventas_detalle (venta_id, producto_id, cantidad, precio_unitario) VALUES ($1, $2, $3, $4)', 
            [ventaId, item.id, item.cantidad, item.precio]);
            
            // RESTAR STOCK
            await client.query('UPDATE productos SET stock = stock - $1 WHERE id = $2', [item.cantidad, item.id]);
        }
        
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ success: false, error: err.message });
    } finally { client.release(); }
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



