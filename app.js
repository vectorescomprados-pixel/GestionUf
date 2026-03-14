document.addEventListener("DOMContentLoaded", function() {
    let users = JSON.parse(localStorage.getItem("users")) || [{username:"admin", password:"admin", role:"admin"}];
    let departamentos = JSON.parse(localStorage.getItem("departamentos")) || [];
    let editIndex = -1;
    let currentUser = JSON.parse(localStorage.getItem("isLogged"));

    const saveData = () => localStorage.setItem("departamentos", JSON.stringify(departamentos));
    const saveUsers = () => localStorage.setItem("users", JSON.stringify(users));

    // --- LOG REPARADO ---
    const addLog = (accion) => {
        if (!currentUser) return;
        const logs = JSON.parse(localStorage.getItem("app_logs")) || [];
        const timestamp = new Date().toLocaleString();
        logs.unshift(`[${timestamp}] ${currentUser.username}: ${accion}`);
        localStorage.setItem("app_logs", JSON.stringify(logs.slice(0, 100))); // Guardamos últimos 100
        renderLogs();
    };

    const renderLogs = () => {
        const div = document.getElementById("log-list");
        if(div) {
            const logs = JSON.parse(localStorage.getItem("app_logs")) || [];
            div.innerHTML = logs.map(l => `<p style="margin:2px 0; border-bottom:1px solid rgba(255,255,255,0.05)">${l}</p>`).join('');
        }
    };

    // --- BOTÓN BAJAR LOG (REPARADO) ---
    document.getElementById("btn-export-log").onclick = () => {
        const logs = JSON.parse(localStorage.getItem("app_logs")) || [];
        if (logs.length === 0) return alert("No hay registros en el log.");
        const blob = new Blob([logs.join("\n")], {type: 'text/plain'});
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Log_Sistema_${new Date().toISOString().slice(0,10)}.txt`;
        link.click();
    };

    // --- IMPORTACIÓN INTELIGENTE ---
    document.getElementById("btn-import").onclick = () => document.getElementById("csv-file").click();
    document.getElementById("csv-file").onchange = (e) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const lines = ev.target.result.split(/\r?\n/);
            let nuevosContador = 0;
            let duplicadosContador = 0;

            for(let i = 1; i < lines.length; i++) {
                const c = lines[i].split(";");
                if(c.length >= 5) {
                    const ufLimpia = c[0].trim();
                    if(!ufLimpia) continue;
                    // Solo agrega si la UF no existe
                    if(!departamentos.some(d => d.UF === ufLimpia)) {
                        departamentos.push({
                            UF: ufLimpia, 
                            Propietario: c[1].trim(), 
                            TelefonoPropietario: c[2].trim(), 
                            Inquilino: c[3].trim(), 
                            TelefonoInquilino: c[4].trim()
                        });
                        nuevosContador++;
                    } else {
                        duplicadosContador++;
                    }
                }
            }
            saveData();
            renderList(departamentos);
            alert(`Importación finalizada.\nNuevos: ${nuevosContador}\nDuplicados saltados: ${duplicadosContador}`);
            addLog(`Importó CSV (+${nuevosContador} registros)`);
        };
        reader.readAsText(e.target.files[0]);
        e.target.value = "";
    };

    // --- RENDER DE REGISTROS CON ALERTAS ---
    window.renderList = (items) => {
        const l = document.getElementById("list");
        l.innerHTML = items.length ? "" : "<p style='text-align:center; opacity:0.5; margin-top:20px;'>Sin registros para mostrar</p>";
        
        items.forEach(d => {
            const idx = departamentos.findIndex(o => o === d);
            const pTel = d.TelefonoPropietario ? d.TelefonoPropietario.replace(/\D/g, '') : "";
            const iTel = d.TelefonoInquilino ? d.TelefonoInquilino.replace(/\D/g, '') : "";
            
            // Sugerencia: Alerta si falta teléfono
            const faltaTel = (!d.TelefonoPropietario && !d.TelefonoInquilino) ? 'border: 1px solid #eab308;' : '';

            const div = document.createElement("div");
            div.className = "item";
            div.style = faltaTel;
            div.innerHTML = `
                <div class="item-header">
                    <strong>UF: ${d.UF}</strong>
                    <div class="admin-actions">
                        <button class="btn primary" onclick="editDept(${idx})" style="padding:4px 8px">Editar</button>
                        <button class="btn danger" onclick="deleteDept(${idx})" style="padding:4px 8px">X</button>
                    </div>
                </div>
                <div class="item-body">
                    <p><b>P:</b> ${d.Propietario || "-"}</p>
                    <div class="phone-line">
                        <small>${d.TelefonoPropietario || "<i>Sin teléfono</i>"}</small>
                        <div class="icon-links">
                            ${pTel ? `<a href="tel:${pTel}"><i class="fas fa-phone"></i></a><a href="https://wa.me/${pTel}" target="_blank" class="wa"><i class="fab fa-whatsapp"></i></a>` : ""}
                        </div>
                    </div>
                    <p style="margin-top:8px"><b>I:</b> ${d.Inquilino || "-"}</p>
                    <div class="phone-line">
                        <small>${d.TelefonoInquilino || "<i>Sin teléfono</i>"}</small>
                        <div class="icon-links">
                            ${iTel ? `<a href="tel:${iTel}"><i class="fas fa-phone"></i></a><a href="https://wa.me/${iTel}" target="_blank" class="wa"><i class="fab fa-whatsapp"></i></a>` : ""}
                        </div>
                    </div>
                </div>`;
            l.appendChild(div);
        });
    };

    // --- RESTO DE FUNCIONES (CRUD Y SESIÓN) ---
    document.getElementById("btn-login").onclick = () => {
        const userIn = document.getElementById("login-user").value;
        const passIn = document.getElementById("login-pass").value;
        const f = users.find(u => u.username === userIn && u.password === passIn);
        if(f) {
            localStorage.setItem("isLogged", JSON.stringify(f));
            currentUser = f; // Actualizamos variable local
            addLog("Inició Sesión");
            location.reload(); 
        } else {
            alert("Credenciales incorrectas");
        }
    };

    document.getElementById("btn-save").onclick = () => {
        const uVal = document.getElementById("f-uf").value.trim();
        if(!uVal) return alert("La UF es obligatoria");
        
        const d = { 
            UF: uVal, 
            Propietario: document.getElementById("f-prop").value.trim(), 
            TelefonoPropietario: document.getElementById("f-telp").value.trim(), 
            Inquilino: document.getElementById("f-inq").value.trim(), 
            TelefonoInquilino: document.getElementById("f-teli").value.trim() 
        };

        if(editIndex === -1) {
            if(departamentos.some(x => x.UF === uVal)) return alert("Error: La UF ya existe.");
            departamentos.push(d);
            addLog(`Creó registro UF: ${uVal}`);
        } else {
            departamentos[editIndex] = d;
            addLog(`Editó registro UF: ${uVal}`);
        }
        saveData();
        renderList(departamentos);
        document.getElementById("modal-form").classList.add("hidden");
    };

    document.getElementById("btn-delete-db").onclick = () => {
        const p = prompt("Confirme con su contraseña para BORRAR TODA LA BASE:");
        if(p === currentUser.password) {
            addLog("BORRADO TOTAL DE BASE DE DATOS");
            departamentos = [];
            saveData();
            renderList([]);
        } else if (p !== null) alert("Contraseña incorrecta");
    };

    // Gestión de usuarios
    document.getElementById("btn-manage-users").onclick = () => {
        const list = document.getElementById("users-admin-list");
        list.innerHTML = users.map((u, i) => `
            <div class="user-row">
                <span>${u.username} (${u.role})</span>
                ${u.username !== 'admin' ? `<button class="btn danger" onclick="deleteUser(${i})" style="padding:2px 8px">X</button>` : ''}
            </div>`).join('');
        document.getElementById("modal-users-list").classList.remove("hidden");
    };

    window.deleteUser = (i) => {
        if(confirm(`¿Eliminar usuario ${users[i].username}?`)) {
            addLog(`Eliminó al usuario: ${users[i].username}`);
            users.splice(i,1);
            saveUsers();
            document.getElementById("btn-manage-users").onclick();
        }
    };

    document.getElementById("btn-save-user").onclick = () => {
        const n = document.getElementById("u-name").value.trim();
        const p = document.getElementById("u-pass").value.trim();
        const r = document.getElementById("u-role").value;
        if(n && p) {
            users.push({username:n, password:p, role:r});
            saveUsers();
            addLog(`Creó usuario: ${n} (${r})`);
            document.getElementById("u-name").value = "";
            document.getElementById("u-pass").value = "";
            document.getElementById("btn-manage-users").onclick();
        }
    };

    // Otros botones
    document.getElementById("btn-logout").onclick = () => {
        addLog("Cerró Sesión");
        localStorage.removeItem("isLogged");
        location.reload();
    };
    document.getElementById("btn-clear").onclick = () => {
        document.getElementById("search-text").value = "";
        document.getElementById("list").innerHTML = "";
    };
    document.getElementById("btn-list").onclick = () => renderList(departamentos);
    document.getElementById("btn-empty").onclick = () => {
        const filtrados = departamentos.filter(d => !d.Inquilino || d.Inquilino === "" || d.Inquilino === "-");
        renderList(filtrados);
        addLog("Filtró departamentos vacíos");
    };
    document.getElementById("btn-search").onclick = () => {
        const t = document.getElementById("search-text").value.toLowerCase();
        const res = departamentos.filter(d => Object.values(d).some(v => String(v).toLowerCase().includes(t)));
        renderList(res);
        addLog(`Buscó: "${t}"`);
    };

    // Inicialización
    if(currentUser) {
        document.getElementById("current-user-display").innerText = currentUser.username;
        document.getElementById("session-label").innerText = currentUser.role === "admin" ? "Admin" : "Usuario";
        if(currentUser.role === "user") document.querySelectorAll(".admin-only").forEach(b => b.classList.add("hidden-role"));
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("main-screen").classList.remove("hidden");
        renderLogs();
    }

    // Modal helpers
    document.getElementById("btn-cancel").onclick = () => document.getElementById("modal-form").classList.add("hidden");
    document.getElementById("btn-close-users").onclick = () => document.getElementById("modal-users-list").classList.add("hidden");
    document.getElementById("mode-toggle").onchange = (e) => {
        document.body.classList.toggle("dark-mode", e.target.checked);
        localStorage.setItem("theme", e.target.checked ? "dark" : "light");
    };
    document.getElementById("log-toggle").onchange = (e) => document.getElementById("log-container").classList.toggle("hidden", !e.target.checked);
});