const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- CONFIGURACIÓN DE BASE DE DATOS ---
const pool = new Pool({
    // Aquí pegas la URL de Supabase que copiaste (la que empieza con postgresql://)
    connectionString: postgresql://postgres:G21091991_a.@db.zvnzvwakatydltdsfggs.supabase.co:5432/postgres', 
    ssl: { rejectUnauthorized: false } // Esto es obligatorio para que Supabase acepte la conexión
    
});

const TASA_PYG = 7500;
let sesion = {};

// --- NAVBAR ---
const getNavbar = () => `
<nav style="background:#1a2a6c; padding:15px; color:white; position:fixed; top:0; width:100%; display:flex; justify-content:space-between; align-items:center; z-index:1000; box-sizing:border-box;">
    <div style="font-weight:bold; cursor:pointer;" onclick="location.href='/admin'">🚀 DISTRIBUIDORA OVELAR</div>
    <div><span>👤 ${sesion.nombre || ''}</span> <button onclick="location.href='/logout'" style="background:#e74c3c; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer; margin-left:10px;">Salir</button></div>
</nav>`;

// --- LOGIN ---
// --- NUEVO LOGIN CON BOTÓN REGISTRAR ---
app.get('/', (req, res) => {
    res.send(`<body style="background:#1a2a6c; font-family:sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0;">
        <div style="background:white; padding:40px; border-radius:20px; width:300px; text-align:center; shadow: 0 10px 25px rgba(0,0,0,0.3);">
            <h2 style="color:#1a2a6c; margin-bottom:25px;">SISTEMA OVELAR</h2>
            <form action="/login" method="POST">
                <input name="u" placeholder="Usuario" required style="width:100%; padding:12px; margin-bottom:10px; border:1px solid #ccc; border-radius:5px;">
                <input name="p" type="password" placeholder="Contraseña" required style="width:100%; padding:12px; margin-bottom:20px; border:1px solid #ccc; border-radius:5px;">
                <button style="width:100%; background:#1a2a6c; color:white; border:none; padding:12px; border-radius:5px; cursor:pointer; font-weight:bold; margin-bottom:15px;">ENTRAR</button>
            </form>
            <div style="border-top: 1px solid #eee; padding-top:15px;">
                <button onclick="location.href='/registro'" style="background:none; border:none; color:#3498db; cursor:pointer; font-size:0.9em;">👤 ¿No tienes cuenta? Registrarme</button>
            </div>
        </div>
    </body>`);
});

// --- PANTALLA DE REGISTRO ---
app.get('/registro', (req, res) => {
    res.send(`<body style="background:#f4f7f6; font-family:sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0;">
        <form action="/usuarios-add" method="POST" style="background:white; padding:40px; border-radius:15px; width:320px; box-shadow:0 4px 15px rgba(0,0,0,0.1);">
            <h2 style="color:#1a2a6c; text-align:center;">Registrar Personal</h2>
            <input name="u" placeholder="Nombre de Usuario" required style="width:100%; padding:12px; margin-bottom:10px;">
            <input name="p" type="password" placeholder="Contraseña" required style="width:100%; padding:12px; margin-bottom:10px;">
            <select name="r" style="width:100%; padding:12px; margin-bottom:20px;">
                <option value="vendedor">Vendedor</option>
                <option value="admin">Administrador</option>
            </select>
            <button style="width:100%; background:#2ecc71; color:white; border:none; padding:12px; border-radius:5px; cursor:pointer; font-weight:bold;">CREAR CUENTA</button>
            <p style="text-align:center;"><a href="/" style="color:#7f8c8d; font-size:0.8em;">Volver al inicio</a></p>
        </form>
    </body>`);
});

// --- GESTIÓN DE PERSONAL (PARA EL ADMIN) ---
app.get('/personal', async (req, res) => {
    if(sesion.rol !== 'admin') return res.redirect('/admin');
    const r = await pool.query('SELECT * FROM usuarios ORDER BY id ASC');
    res.send(`<body style="font-family:sans-serif; background:#f4f7f6; padding-top:100px;">
        ${getNavbar()}
        <div style="max-width:800px; margin:auto; background:white; padding:30px; border-radius:15px;">
            <h2>👤 Gestión de Personal</h2>
            <table style="width:100%; border-collapse:collapse;">
                <tr style="background:#1a2a6c; color:white;"><th style="padding:10px;">ID</th><th>Usuario</th><th>Rol</th><th>Acciones</th></tr>
                ${r.rows.map(u => `<tr>
                    <td style="padding:10px;">${u.id}</td>
                    <td id="un-${u.id}">${u.nombre_usuario}</td>
                    <td id="ur-${u.id}">${u.rol}</td>
                    <td>
                        <button onclick="editU(${u.id})" id="ube-${u.id}">✏️</button>
                        <button onclick="saveU(${u.id})" id="ubs-${u.id}" style="display:none; background:green; color:white;">💾</button>
                        <button onclick="delU(${u.id})" style="background:red; color:white;">🗑️</button>
                    </td>
                </tr>`).join('')}
            </table>
        </div>
        <script>
            function editU(id){
                const n=document.getElementById('un-'+id), r=document.getElementById('ur-'+id);
                n.innerHTML='<input id="iun-'+id+'" value="'+n.innerText+'">';
                r.innerHTML='<select id="iur-'+id+'"><option value="vendedor">vendedor</option><option value="admin">admin</option></select>';
                document.getElementById('ube-'+id).style.display='none';
                document.getElementById('ubs-'+id).style.display='inline';
            }
            async function saveU(id){
                const n=document.getElementById('iun-'+id).value, r=document.getElementById('iur-'+id).value;
                await fetch('/usuarios-update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,nombre:n,rol:r})});
                location.reload();
            }
            async function delU(id){
                if(confirm('¿Eliminar este usuario?')){
                    await fetch('/usuarios-delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});
                    location.reload();
                }
            }
        </script></body>`);
});

app.post('/login', async (req, res) => {
    const { u, p } = req.body;
    const r = await pool.query('SELECT * FROM usuarios WHERE nombre_usuario=$1 AND contrasena=$2', [u, p]);
    if (r.rows.length > 0) {
        sesion = { id: r.rows[0].id, nombre: r.rows[0].nombre_usuario, rol: r.rows[0].rol };
        res.redirect('/admin');
    } else { res.send("<script>alert('Error'); window.location='/';</script>"); }
});

app.post('/usuarios-add', async (req, res) => {
    const { u, p, r } = req.body;
    await pool.query('INSERT INTO usuarios (nombre_usuario, contrasena, rol) VALUES ($1,$2,$3)', [u, p, r]);
    res.send("<script>alert('Usuario registrado'); window.location='/';</script>");
});

app.post('/usuarios-update', async (req, res) => {
    await pool.query('UPDATE usuarios SET nombre_usuario=$1, rol=$2 WHERE id=$3', [req.body.nombre, req.body.rol, req.body.id]);
    res.json({ok:true});
});

app.post('/usuarios-delete', async (req, res) => {
    if(req.body.id == sesion.id) return res.status(500).send("No puedes borrarte a ti mismo");
    await pool.query('DELETE FROM usuarios WHERE id=$1', [req.body.id]);
    res.json({ok:true});
});
// --- PANEL PRINCIPAL ---
app.get('/admin', (req, res) => {
    if(!sesion.id) return res.redirect('/');
    const esAdmin = (sesion.rol === 'admin');
    const btn = (url, icon, label, ok, color) => `
        <div onclick="${ok ? `location.href='${url}'` : "alert('Restringido')"}" style="background:white; padding:25px; border-radius:15px; text-align:center; cursor:pointer; border-bottom:5px solid ${color}; opacity:${ok?1:0.5}; shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="font-size:40px;">${icon}</div><b>${label}</b>
        </div>`;
    res.send(`<body style="font-family:sans-serif; background:#f4f7f6; padding-top:100px; margin:0;">
        ${getNavbar()}
        <div style="max-width:1000px; margin:auto; display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:20px; padding:20px;">
            ${btn('/personal', '👥', 'Personal', esAdmin, '#9b59b6')}
            ${btn('/vendedor', '🛒', 'Ventas', true, '#3498db')}
            ${btn('/clientes', '👥', 'Clientes', true, '#2ecc71')}
            ${btn('/productos', '📦', 'Stock', esAdmin, '#f1c40f')}
            ${btn('/historial', '📋', 'Historial', true, '#34495e')}
            ${btn('/deposito', '🚚', 'Depósito', true, '#e67e22')}
            ${btn('/cobranzas', '💳', 'Cobranzas', esAdmin, '#d35400')}
        </div>
    </body>`);
});

// --- CLIENTES (CON EDICIÓN Y ELIMINACIÓN) ---
app.get('/clientes', async (req, res) => {
    if(!sesion.id) return res.redirect('/');
    const r = await pool.query('SELECT * FROM clientes ORDER BY nombre ASC');
    res.send(`<body style="font-family:sans-serif; background:#f4f7f6; padding-top:100px;">
        ${getNavbar()}
        <div style="max-width:900px; margin:auto; background:white; padding:30px; border-radius:15px;">
            <h2>👥 Clientes</h2>
            <form action="/clientes-add" method="POST" style="margin-bottom:20px; display:flex; gap:10px;">
                <input name="nombre" placeholder="Nombre" required style="flex:2; padding:10px;">
                <input name="telefono" placeholder="Teléfono" style="flex:1; padding:10px;">
                <button style="background:#2ecc71; color:white; border:none; padding:10px;">+ Añadir</button>
            </form>
            <table style="width:100%; border-collapse:collapse;">
                <tr style="background:#1a2a6c; color:white;"><th style="padding:10px;">Nombre</th><th>Teléfono</th><th>Acciones</th></tr>
                ${r.rows.map(c => `<tr style="border-bottom:1px solid #ddd;">
                    <td style="padding:10px;" id="cn-${c.id}">${c.nombre}</td>
                    <td id="ct-${c.id}">${c.telefono || '-'}</td>
                    <td>
                        <button onclick="editC(${c.id})" id="ce-${c.id}">✏️</button>
                        <button onclick="saveC(${c.id})" id="cs-${c.id}" style="display:none; background:green; color:white;">💾</button>
                        <button onclick="delC(${c.id},'${c.nombre}')" style="background:red; color:white;">🗑️</button>
                    </td>
                </tr>`).join('')}
            </table>
        </div>
        <script>
            function editC(id){
                const n=document.getElementById('cn-'+id), t=document.getElementById('ct-'+id);
                n.innerHTML='<input id="icn-'+id+'" value="'+n.innerText+'">';
                t.innerHTML='<input id="ict-'+id+'" value="'+(t.innerText==='-'?'':t.innerText)+'">';
                document.getElementById('ce-'+id).style.display='none';
                document.getElementById('cs-'+id).style.display='inline';
            }
            async function saveC(id){
                const n=document.getElementById('icn-'+id).value, t=document.getElementById('ict-'+id).value;
                await fetch('/clientes-update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,nombre:n,telefono:t})});
                location.reload();
            }
            async function delC(id, nom){
                if(confirm('¿Eliminar '+nom+'?')){
                    const res=await fetch('/clientes-delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});
                    if(res.ok) location.reload(); else alert('Tiene ventas asociadas');
                }
            }
        </script></body>`);
});

app.post('/clientes-add', async (req, res) => { await pool.query('INSERT INTO clientes (nombre, telefono) VALUES ($1,$2)', [req.body.nombre, req.body.telefono]); res.redirect('/clientes'); });
app.post('/clientes-update', async (req, res) => { await pool.query('UPDATE clientes SET nombre=$1, telefono=$2 WHERE id=$3', [req.body.nombre, req.body.telefono, req.body.id]); res.json({ok:true}); });
app.post('/clientes-delete', async (req, res) => { try{ await pool.query('DELETE FROM clientes WHERE id=$1',[req.body.id]); res.json({ok:true}); }catch(e){res.status(500).send('Error');} });

// --- PRODUCTOS (CON EDICIÓN Y ELIMINACIÓN) ---
app.get('/productos', async (req, res) => {
    if(sesion.rol !== 'admin') return res.redirect('/admin');
    const r = await pool.query('SELECT * FROM productos ORDER BY nombre ASC');
    res.send(`<body style="font-family:sans-serif; background:#f4f7f6; padding-top:100px;">
        ${getNavbar()}
        <div style="max-width:1000px; margin:auto; background:white; padding:30px; border-radius:15px;">
            <h2>📦 Stock</h2>
            <form action="/productos-add" method="POST" style="margin-bottom:20px; display:grid; grid-template-columns: 2fr 1fr 1fr 1fr auto; gap:10px;">
                <input name="n" placeholder="Producto" required>
                <input name="p" type="number" step="0.01" placeholder="Precio $">
                <input name="s" type="number" placeholder="Stock">
                <input name="c" placeholder="Código">
                <button style="background:#f1c40f;">+ Añadir</button>
            </form>
            <table style="width:100%; border-collapse:collapse;">
                <tr style="background:#1a2a6c; color:white;"><th style="padding:10px;">Nombre</th><th>Precio $</th><th>Stock</th><th>Código</th><th>Acciones</th></tr>
                ${r.rows.map(p => `<tr style="border-bottom:1px solid #ddd;">
                    <td style="padding:10px;" id="pn-${p.id}">${p.nombre}</td>
                    <td id="pp-${p.id}">${p.precio}</td>
                    <td id="ps-${p.id}">${p.stock}</td>
                    <td id="pc-${p.id}">${p.codigo_barras || '-'}</td>
                    <td>
                        <button onclick="editP(${p.id})" id="pe-${p.id}">✏️</button>
                        <button onclick="saveP(${p.id})" id="psave-${p.id}" style="display:none; background:green; color:white;">💾</button>
                        <button onclick="delP(${p.id},'${p.nombre}')" style="background:red; color:white;">🗑️</button>
                    </td>
                </tr>`).join('')}
            </table>
        </div>
        <script>
            function editP(id){
                const n=document.getElementById('pn-'+id), p=document.getElementById('pp-'+id), s=document.getElementById('ps-'+id), c=document.getElementById('pc-'+id);
                n.innerHTML='<input id="ipn-'+id+'" value="'+n.innerText+'">';
                p.innerHTML='<input id="ipp-'+id+'" type="number" step="0.01" value="'+p.innerText+'" style="width:60px">';
                s.innerHTML='<input id="ips-'+id+'" type="number" value="'+s.innerText+'" style="width:50px">';
                c.innerHTML='<input id="ipc-'+id+'" value="'+(c.innerText==='-'?'':c.innerText)+'">';
                document.getElementById('pe-'+id).style.display='none';
                document.getElementById('psave-'+id).style.display='inline';
            }
            async function saveP(id){
                const n=document.getElementById('ipn-'+id).value, p=document.getElementById('ipp-'+id).value, s=document.getElementById('ips-'+id).value, c=document.getElementById('ipc-'+id).value;
                await fetch('/productos-update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,nombre:n,precio:p,stock:s,codigo:c})});
                location.reload();
            }
            async function delP(id, nom){
                if(confirm('¿Eliminar '+nom+'?')){
                    const res=await fetch('/productos-delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});
                    if(res.ok) location.reload(); else alert('No se puede eliminar');
                }
            }
        </script></body>`);
});

app.post('/productos-add', async (req, res) => { await pool.query('INSERT INTO productos (nombre, precio, stock, codigo_barras) VALUES ($1,$2,$3,$4)', [req.body.n, req.body.p, req.body.s, req.body.c]); res.redirect('/productos'); });
app.post('/productos-update', async (req, res) => { await pool.query('UPDATE productos SET nombre=$1, precio=$2, stock=$3, codigo_barras=$4 WHERE id=$5', [req.body.nombre, req.body.precio, req.body.stock, req.body.codigo, req.body.id]); res.json({ok:true}); });
app.post('/productos-delete', async (req, res) => { try{ await pool.query('DELETE FROM productos WHERE id=$1',[req.body.id]); res.json({ok:true}); }catch(e){res.status(500).send('Error');} });

// --- VENTAS (CON BUSCADOR Y PDF) ---
app.get('/vendedor', async (req, res) => {
    if(!sesion.id) return res.redirect('/');
    const p = await pool.query('SELECT * FROM productos WHERE stock > 0');
    const c = await pool.query('SELECT * FROM clientes ORDER BY nombre');
    res.send(`
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <body style="font-family:sans-serif; background:#f4f7f6; padding-top:100px;">
        ${getNavbar()}
        <div style="max-width:900px; margin:auto; background:white; padding:30px; border-radius:15px;">
            <h2>🛒 Nueva Venta</h2>
            <div style="display:flex; gap:10px; margin-bottom:15px;">
                <select id="cli" style="flex:2; padding:10px;">${c.rows.map(x=>`<option value="${x.id}">${x.nombre}</option>`).join('')}</select>
                <select id="pago" onchange="document.getElementById('dPlazo').style.display=(this.value=='credito'?'block':'none')" style="flex:1; padding:10px;"><option value="contado">Contado</option><option value="credito">Crédito</option></select>
                <div id="dPlazo" style="display:none;"><input id="plazo" type="number" value="30" style="width:60px; padding:10px;"> días</div>
            </div>
            <input type="text" id="bus" placeholder="Escriba nombre o escanee código..." onkeyup="add(event)" style="width:100%; padding:15px; font-size:1.2em; margin-bottom:20px;">
            <table style="width:100%; border-collapse:collapse;"><tbody id="cart"></tbody></table>
            <h2 style="text-align:right;">Total: Gs. <span id="total">0</span></h2>
            <button onclick="finish()" style="width:100%; background:#27ae60; color:white; padding:20px; border:none; border-radius:10px; cursor:pointer; font-weight:bold;">FINALIZAR Y PDF</button>
        </div>
        <script>
            let carrito = []; const PYG = 7500;
            const prods = [${p.rows.map(x=>`{id:${x.id},nombre:'${x.nombre}',precio:${x.precio},codigo:'${x.codigo_barras||''}'}`).join(',')}];
            function add(e){
                if(e.key==='Enter'){
                    const v=e.target.value.toLowerCase();
                    const f=prods.find(x=>x.codigo===v || x.nombre.toLowerCase().includes(v));
                    if(f){ const ex=carrito.find(x=>x.id===f.id); if(ex) ex.cant++; else carrito.push({...f,cant:1}); render(); e.target.value=''; }
                }
            }
            function render(){
                let h='', t=0;
                carrito.forEach((x,i)=>{
                    let s=x.precio*x.cant*PYG; t+=s;
                    h+='<tr style="border-bottom:1px solid #eee"><td style="padding:10px">'+x.nombre+'</td><td><input type="number" value="'+x.cant+'" onchange="carrito['+i+'].cant=this.value;render()" style="width:50px"></td><td>Gs. '+s.toLocaleString()+'</td><td><button onclick="carrito.splice('+i+',1);render()">❌</button></td></tr>';
                });
                document.getElementById('cart').innerHTML=h; document.getElementById('total').innerText=t.toLocaleString();
            }
            async function finish(){
                if(carrito.length==0) return;
                const body = {clienteId:document.getElementById('cli').value, productos:carrito, vendedorId:${sesion.id}, tipoPago:document.getElementById('pago').value, plazo:document.getElementById('plazo').value};
                const res = await fetch('/vender-lote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
                if(res.ok){ pdf(); setTimeout(()=>location.reload(),1500); }
            }
            function pdf(){
                const {jsPDF}=window.jspdf; const d=new jsPDF();
                d.text("DISTRIBUIDORA OVELAR", 10, 20); d.text("Venta: "+new Date().toLocaleString(), 10, 30);
                let y=50; carrito.forEach(x=>{ d.text(x.nombre+" x"+x.cant+" - Gs. "+(x.precio*x.cant*7500).toLocaleString(), 10, y); y+=10; });
                d.text("TOTAL: Gs. "+document.getElementById('total').innerText, 10, y+10);
                d.save("Venta.pdf");
            }
        </script></body>`);
});

app.post('/vender-lote', async (req, res) => {
    const { clienteId, productos, vendedorId, tipoPago, plazo } = req.body;
    try {
        await pool.query('BEGIN');
        for (let p of productos) {
            await pool.query('UPDATE productos SET stock=stock-$1 WHERE id=$2', [p.cant, p.id]);
            await pool.query('INSERT INTO pedidos (producto_id,cantidad,cliente_id,vendedor_id,precio_venta,estado,tipo_pago,pagado,fecha_vencimiento) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,CURRENT_DATE + CAST($9 || \' days\' AS INTERVAL))', 
            [p.id, p.cant, clienteId, vendedorId, p.precio, 'pendiente', tipoPago, tipoPago==='contado', plazo||0]);
        }
        await pool.query('COMMIT'); res.json({ok:true});
    } catch(e) { await pool.query('ROLLBACK'); res.status(500).send(e.message); }
});

// --- DEPÓSITO CON TICKET RUC ---
app.get('/deposito', async (req, res) => {
    if(!sesion.id) return res.redirect('/');
    const r = await pool.query(`SELECT p.id, c.nombre as cli, pr.nombre as prod, p.cantidad, (p.cantidad*p.precio_venta*7500) as total, p.tipo_pago FROM pedidos p JOIN clientes c ON p.cliente_id=c.id JOIN productos pr ON p.producto_id=pr.id WHERE p.estado='pendiente'`);
    res.send(`<body style="font-family:sans-serif; background:#f4f7f6; padding-top:100px;">
        ${getNavbar()}
        <div style="max-width:900px; margin:auto; background:white; padding:30px; border-radius:15px;">
            <h2>🚚 Pendientes de Entrega</h2>
            <table style="width:100%; border-collapse:collapse;">
                <tr style="background:#eee;"><th style="padding:10px;">Cliente</th><th>Producto</th><th>Cant.</th><th>Acciones</th></tr>
                ${r.rows.map(f => `<tr><td style="padding:10px;">${f.cli}</td><td>${f.prod}</td><td>${f.cantidad}</td><td>
                    <button onclick="ticket('${f.cli}','${f.prod}',${f.cantidad},${f.total},'${f.tipo_pago}')">🖨️ Ticket</button>
                    <button onclick="entregar(${f.id})" style="background:green; color:white;">✅ OK</button>
                </td></tr>`).join('')}
            </table>
        </div>
        <script>
            async function entregar(id){ await fetch('/entregar-ped',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})}); location.reload(); }
            function ticket(c,pr,ca,t,p){
                const v=window.open('','','width=300,height=600');
                v.document.write("<html><body style='font-family:monospace;width:280px;text-align:center;'>");
                v.document.write("<b>DISTRIBUIDORA OVELAR</b><br>RUC: 3.467.088-2<br>Km 5 CDE - 0983522183<hr>");
                v.document.write("<div style='text-align:left'>FECHA: "+new Date().toLocaleString()+"<br>CLI: "+c+"<br>PAGO: "+p+"<hr>");
                v.document.write(pr+" x"+ca+"<br>TOTAL: Gs. "+t.toLocaleString()+"</div><hr>");
                v.document.write("<br><br>_________________<br>Recibí Conforme");
                v.document.write("<script>window.print();window.close();</scr"+"ipt></body></html>");
            }
        </script></body>`);
});

app.post('/entregar-ped', async (req, res) => { await pool.query("UPDATE pedidos SET estado='entregado' WHERE id=$1", [req.body.id]); res.json({ok:true}); });

// --- COBRANZAS ---
app.get('/cobranzas', async (req, res) => {
    const r = await pool.query(`SELECT p.id, c.nombre as cli, (p.cantidad*p.precio_venta*7500) as total, p.fecha_vencimiento FROM pedidos p JOIN clientes c ON p.cliente_id=c.id WHERE p.pagado=false`);
    res.send(`<body style="font-family:sans-serif; background:#f4f7f6; padding-top:100px;">${getNavbar()}<div style="max-width:800px; margin:auto; background:white; padding:30px; border-radius:15px;">
        <h2>💳 Cobranzas</h2>
        ${r.rows.map(f => `<div style="padding:10px; border-bottom:1px solid #eee;">${f.cli} - Gs. ${f.total.toLocaleString()} - Vence: ${new Date(f.fecha_vencimiento).toLocaleDateString()} <button onclick="pagar(${f.id})">Cobrar</button></div>`).join('')}
    </div><script>async function pagar(id){ await fetch('/pagar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})}); location.reload(); }</script></body>`);
});
app.post('/pagar', async (req, res) => { await pool.query("UPDATE pedidos SET pagado=true WHERE id=$1",[req.body.id]); res.json({ok:true}); });

// --- HISTORIAL ---
app.get('/historial', async (req, res) => {
    const d = req.query.desde || new Date().toISOString().split('T')[0];
    const h = req.query.hasta || new Date().toISOString().split('T')[0];
    const r = await pool.query(`SELECT p.fecha, c.nombre as cli, pr.nombre as prod, p.cantidad, (p.cantidad*p.precio_venta*7500) as total FROM pedidos p JOIN clientes c ON p.cliente_id=c.id JOIN productos pr ON p.producto_id=pr.id WHERE p.fecha::date BETWEEN $1 AND $2 ORDER BY p.fecha DESC`, [d,h]);
    let tot = 0;
    let table = r.rows.map(x=>{ tot+=x.total; return `<tr><td style="padding:10px">${new Date(x.fecha).toLocaleString()}</td><td>${x.cli}</td><td>${x.prod}</td><td>Gs. ${x.total.toLocaleString()}</td></tr>`}).join('');
    res.send(`<body style="font-family:sans-serif; background:#f4f7f6; padding-top:100px;">${getNavbar()}<div style="max-width:1000px; margin:auto; background:white; padding:30px; border-radius:15px;">
        <form>Desde: <input type="date" name="desde" value="${d}"> Hasta: <input type="date" name="hasta" value="${h}"> <button>Filtrar</button></form>
        <table style="width:100%; border-collapse:collapse; margin-top:20px;">
            <tr style="background:#eee;"><th style="padding:10px;">Fecha</th><th>Cliente</th><th>Producto</th><th>Total</th></tr>
            ${table}
        </table>
        <h2 style="text-align:right">Total Gs. ${tot.toLocaleString()}</h2>
    </div></body>`);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log('🚀 SISTEMA OVELAR ONLINE EN PUERTO ' + PORT));


