document.addEventListener("DOMContentLoaded", function() {
    // Configuración inicial de usuarios
    const defaultUsers = [
        {username: "admin", password: "admin", role: "admin"},
        {username: "demo", password: "demo", role: "user"}
    ];
    let users = JSON.parse(localStorage.getItem("users")) || defaultUsers;
    localStorage.setItem("users", JSON.stringify(users));

    let departamentos = JSON.parse(localStorage.getItem("departamentos")) || [];
    let currentUser = null;

    const saveData = () => localStorage.setItem("departamentos", JSON.stringify(departamentos));

    const showScreen = (id) => {
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("main-screen").classList.add("hidden");
        document.getElementById(id).classList.remove("hidden");
    };

    // --- LOGIN ---
    function iniciarSesion(u = null, p = null) {
        const user = u || document.getElementById("login-user").value;
        const pass = p || document.getElementById("login-pass").value;
        const usuario = users.find(usr => usr.username === user && usr.password === pass);

        if (usuario) {
            currentUser = usuario;
            document.getElementById("current-user").textContent = usuario.username;
            showScreen("main-screen");
            renderList();
        } else {
            document.getElementById("login-msg").textContent = "Usuario o clave incorrectos";
        }
    }

    document.getElementById("btn-login").onclick = () => iniciarSesion();
    document.getElementById("btn-demo").onclick = () => iniciarSesion("demo", "demo");
    document.getElementById("btn-logout").onclick = () => location.reload();

    // --- RECUPERAR CONTRASEÑA ---
    document.getElementById("btn-recover").onclick = function() {
        const phone = prompt("Ingrese teléfono autorizado:");
        if (phone === "1131552679") {
            const newpass = prompt("Nueva contraseña para admin:");
            if (newpass) {
                const idx = users.findIndex(u => u.username === "admin");
                users[idx].password = newpass;
                localStorage.setItem("users", JSON.stringify(users));
                alert("Contraseña de administrador actualizada");
            }
        } else {
            alert("Teléfono no reconocido");
        }
    };

    // --- BÚSQUEDA ---
    document.getElementById("btn-search").onclick = function() {
        const texto = document.getElementById("search-text").value.toLowerCase();
        const resultados = departamentos.filter(d => 
            String(d.UF).toLowerCase().includes(texto) ||
            (d.Propietario || "").toLowerCase().includes(texto) ||
            (d.Inquilino || "").toLowerCase().includes(texto) ||
            (d.TelefonoPropietario || "").toLowerCase().includes(texto) ||
            (d.TelefonoInquilino || "").toLowerCase().includes(texto)
        );
        renderList(resultados);
    };

    document.getElementById("btn-clear").onclick = () => {
        document.getElementById("search-text").value = "";
        renderList();
    };

    document.getElementById("btn-list").onclick = () => renderList();

    document.getElementById("btn-empty").onclick = () => {
        const vacios = departamentos.filter(d => !d.Inquilino || d.Inquilino === "-" || d.Inquilino.trim() === "");
        renderList(vacios);
    };

    // --- CRUD ---
    document.getElementById("btn-add").onclick = function() {
        const uf = prompt("Número de UF:");
        if (!uf) return;
        departamentos.push({
            UF: uf,
            Propietario: prompt("Propietario:"),
            TelefonoPropietario: prompt("Tel. Propietario:"),
            Inquilino: prompt("Inquilino:"),
            TelefonoInquilino: prompt("Tel. Inquilino:")
        });
        saveData(); renderList();
    };

    window.editDept = function(i) {
        const d = departamentos[i];
        const newUF = prompt("UF:", d.UF);
        if (newUF) {
            departamentos[i] = {
                UF: newUF,
                Propietario: prompt("Propietario:", d.Propietario),
                TelefonoPropietario: prompt("Tel Prop:", d.TelefonoPropietario),
                Inquilino: prompt("Inquilino:", d.Inquilino),
                TelefonoInquilino: prompt("Tel Inq:", d.TelefonoInquilino)
            };
            saveData(); renderList();
        }
    };

    window.deleteDept = function(i) {
        if (confirm("¿Eliminar este registro?")) {
            departamentos.splice(i, 1);
            saveData(); renderList();
        }
    };

    // --- CSV (CON VALIDACIÓN DE DUPLICADOS) ---
    document.getElementById("btn-export").onclick = function() {
        let csv = "UF,Propietario,TelProp,Inquilino,TelInq\n";
        departamentos.forEach(d => {
            csv += `${d.UF},${d.Propietario},${d.TelefonoPropietario},${d.Inquilino},${d.TelefonoInquilino}\n`;
        });
        const blob = new Blob([csv], {type: 'text/csv'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'base_datos.csv';
        a.click();
    };

    document.getElementById("btn-import").onclick = function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.onchange = e => {
            const reader = new FileReader();
            reader.readAsText(e.target.files[0]);
            reader.onload = r => {
                const rows = r.target.result.split('\n').slice(1);
                rows.forEach(row => {
                    const cols = row.split(',');
                    if (cols[0]) {
                        const data = { UF: cols[0].trim(), Propietario: cols[1]?.trim(), TelefonoPropietario: cols[2]?.trim(), Inquilino: cols[3]?.trim(), TelefonoInquilino: cols[4]?.trim() };
                        const idx = departamentos.findIndex(d => d.UF === data.UF);
                        if (idx !== -1) departamentos[idx] = data; // Sobrescribe si existe
                        else departamentos.push(data); // Agrega si es nuevo
                    }
                });
                saveData(); renderList(); alert("Importación exitosa (sin duplicados)");
            };
        };
        input.click();
    };

    document.getElementById("btn-delete-db").onclick = function() {
        const p = prompt("Contraseña admin para BORRAR TODO:");
        if (p === users.find(u => u.role === "admin").password) {
            if (confirm("¿Seguro que desea vaciar la base de datos?")) {
                departamentos = []; saveData(); renderList();
            }
        } else { alert("Clave incorrecta"); }
    };

    document.getElementById("btn-register-user").onclick = function() {
        const u = prompt("Nuevo usuario:");
        const p = prompt("Contraseña:");
        if (u && p) {
            users.push({username: u, password: p, role: "user"});
            localStorage.setItem("users", JSON.stringify(users));
            alert("Usuario registrado.");
        }
    };

    // --- RENDERIZADO CON ICONOS DE CONTACTO ---
    window.renderList = function(items = departamentos) {
        const list = document.getElementById("list");
        list.innerHTML = items.length ? "" : "<p class='muted'>No hay registros</p>";
        
        items.forEach((d, i) => {
            const cleanTel = (t) => t ? t.replace(/\D/g, '') : '';
            const div = document.createElement("div");
            div.className = "item";
            div.innerHTML = `
                <div style="float:right">
                    <button class="btn-mini primary" onclick="editDept(${i})">Editar</button>
                    <button class="btn-mini danger" onclick="deleteDept(${i})">Eliminar</button>
                </div>
                <strong>UF ${d.UF}</strong>
                <div class="contact-row">
                    <span>P: ${d.Propietario || "-"}</span>
                    ${d.TelefonoPropietario ? `
                        <a href="tel:${cleanTel(d.TelefonoPropietario)}" class="contact-link">📞</a>
                        <a href="https://wa.me/${cleanTel(d.TelefonoPropietario)}" target="_blank" class="contact-link">💬</a>
                    ` : ''}
                </div>
                <div class="contact-row">
                    <span>I: ${d.Inquilino || "-"}</span>
                    ${d.TelefonoInquilino ? `
                        <a href="tel:${cleanTel(d.TelefonoInquilino)}" class="contact-link">📞</a>
                        <a href="https://wa.me/${cleanTel(d.TelefonoInquilino)}" target="_blank" class="contact-link">💬</a>
                    ` : ''}
                </div>
            `;
            list.appendChild(div);
        });
    };
});