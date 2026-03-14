document.addEventListener("DOMContentLoaded", function() {
    const masterPhone = "1131552679";
    let users = JSON.parse(localStorage.getItem("users")) || [{username:"admin", password:"admin", role:"admin"}];
    let departamentos = JSON.parse(localStorage.getItem("departamentos")) || [];
    let editIndex = -1;
    let currentUser = JSON.parse(localStorage.getItem("isLogged"));

    const saveData = () => localStorage.setItem("departamentos", JSON.stringify(departamentos));
    const saveUsers = () => localStorage.setItem("users", JSON.stringify(users));

    // --- LOGS ---
    const addLog = (accion) => {
        if (!currentUser) return;
        const logs = JSON.parse(localStorage.getItem("app_logs")) || [];
        logs.unshift(`[${new Date().toLocaleTimeString()}] ${currentUser.username}: ${accion}`);
        localStorage.setItem("app_logs", JSON.stringify(logs.slice(0, 100)));
        renderLogs();
    };

    const renderLogs = () => {
        const div = document.getElementById("log-list");
        if(div) {
            const logs = JSON.parse(localStorage.getItem("app_logs")) || [];
            div.innerHTML = logs.map(l => `<p style="margin:2px 0; border-bottom:1px solid rgba(120,120,120,0.1)">${l}</p>`).join('');
        }
    };

    // --- SESIÓN ---
    const handleLogin = () => {
        const u = document.getElementById("login-user").value;
        const p = document.getElementById("login-pass").value;
        const f = users.find(x => x.username === u && x.password === p);
        if(f) {
            localStorage.setItem("isLogged", JSON.stringify(f));
            currentUser = f;
            addLog("INICIÓ SESIÓN");
            location.reload();
        } else alert("Datos incorrectos");
    };

    // --- BÚSQUEDA ---
    const handleSearch = () => {
        const t = document.getElementById("search-text").value.toLowerCase();
        if(!t) { renderList(departamentos); addLog("Ver lista completa"); return; }
        const res = departamentos.filter(d => Object.values(d).some(v => String(v).toLowerCase().includes(t)));
        renderList(res);
        addLog(`BUSCÓ: "${t}"`);
    };

    // --- RENDER (ALERTA AMARILLA) ---
    window.renderList = (items) => {
        const listDiv = document.getElementById("list");
        listDiv.innerHTML = items.length ? "" : "<p style='text-align:center; padding:20px; opacity:0.5'>Sin datos</p>";
        
        items.forEach(d => {
            const idx = departamentos.findIndex(o => o === d);
            const pT = d.TelefonoPropietario?.replace(/\D/g, '');
            const iT = d.TelefonoInquilino?.replace(/\D/g, '');
            const sinTel = (!pT && !iT);
            
            const div = document.createElement("div");
            div.className = "item";
            if(sinTel) div.style = "border: 2px solid #eab308; background: rgba(234, 179, 8, 0.05);";
            
            div.innerHTML = `
                <div class="item-header"><strong>UF: ${d.UF}</strong>
                    <div>
                        <button class="btn primary" onclick="editDept(${idx})" style="padding:4px 8px">Editar</button>
                        <button class="btn danger" onclick="deleteDept(${idx})" style="padding:4px 8px">X</button>
                    </div>
                </div>
                <p><b>P:</b> ${d.Propietario || "-"}</p>
                <div class="phone-line"><small>${d.TelefonoPropietario || "<i>Sin número</i>"}</small>
                    <div class="icon-links">${pT ? `<a href="tel:${pT}"><i class="fas fa-phone"></i></a><a href="https://wa.me/${pT}" target="_blank"><i class="fab fa-whatsapp"></i></a>` : ""}</div>
                </div>
                <p style="margin-top:8px"><b>I:</b> ${d.Inquilino || "-"}</p>
                <div class="phone-line"><small>${d.TelefonoInquilino || "<i>Sin número</i>"}</small>
                    <div class="icon-links">${iT ? `<a href="tel:${iT}"><i class="fas fa-phone"></i></a><a href="https://wa.me/${iT}" target="_blank"><i class="fab fa-whatsapp"></i></a>` : ""}</div>
                </div>
                ${sinTel ? '<div style="color:#eab308; font-size:10px; font-weight:bold; margin-top:5px">⚠️ CARGAR CONTACTO</div>' : ''}
            `;
            listDiv.appendChild(div);
        });
    };

    // --- CRUD ---
    document.getElementById("btn-save").onclick = () => {
        const uf = document.getElementById("f-uf").value.trim();
        if(!uf) return alert("UF obligatoria");
        const obj = { UF:uf, Propietario:document.getElementById("f-prop").value, TelefonoPropietario:document.getElementById("f-telp").value, Inquilino:document.getElementById("f-inq").value, TelefonoInquilino:document.getElementById("f-teli").value };
        
        if(editIndex === -1) {
            if(departamentos.some(x => x.UF === uf)) return alert("UF ya existe");
            departamentos.push(obj); addLog(`Creó UF: ${uf}`);
        } else {
            departamentos[editIndex] = obj; addLog(`Editó UF: ${uf}`);
        }
        saveData(); renderList(departamentos); document.getElementById("modal-form").classList.add("hidden");
    };

    window.editDept = (i) => {
        editIndex = i; const d = departamentos[i];
        document.getElementById("f-uf").value = d.UF; document.getElementById("f-prop").value = d.Propietario;
        document.getElementById("f-telp").value = d.TelefonoPropietario; document.getElementById("f-inq").value = d.Inquilino;
        document.getElementById("f-teli").value = d.TelefonoInquilino;
        document.getElementById("modal-form").classList.remove("hidden");
    };

    window.deleteDept = (i) => {
        if(confirm("¿Eliminar?")) { addLog(`Borró UF: ${departamentos[i].UF}`); departamentos.splice(i,1); saveData(); renderList(departamentos); }
    };

    // --- IMPORT/EXPORT EXCEL ---
    document.getElementById("btn-import").onclick = () => document.getElementById("csv-file").click();
    document.getElementById("csv-file").onchange = (e) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const lines = ev.target.result.split(/\r?\n/);
            let n = 0, d = 0;
            for(let i=1; i<lines.length; i++){
                const c = lines[i].split(";");
                if(c.length >= 5){
                    const uf = c[0].trim();
                    if(!departamentos.some(x => x.UF === uf)){
                        departamentos.push({UF:uf, Propietario:c[1], TelefonoPropietario:c[2], Inquilino:c[3], TelefonoInquilino:c[4]}); n++;
                    } else d++;
                }
            }
            saveData(); renderList(departamentos); alert(`Carga: ${n} nuevos, ${d} duplicados saltados.`); addLog(`Importó CSV (+${n})`);
        };
        reader.readAsText(e.target.files[0]);
    };

    document.getElementById("btn-export").onclick = () => {
        let csv = "UF;Propietario;TelProp;Inquilino;TelInq\n";
        departamentos.forEach(d => csv += `${d.UF};${d.Propietario};${d.TelefonoPropietario};${d.Inquilino};${d.TelefonoInquilino}\n`);
        const BOM = "\uFEFF";
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([BOM + csv], {type:'text/csv;charset=utf-8;'}));
        a.download = "BaseUF_Excel.csv"; a.click(); addLog("Exportó Base a Excel");
    };

    // --- RECUPERACIÓN ---
    document.getElementById("btn-recover").onclick = () => document.getElementById("modal-recover").classList.remove("hidden");
    document.getElementById("btn-verify-phone").onclick = () => {
        const ph = document.getElementById("recover-phone").value.trim();
        const st2 = document.getElementById("recover-step-2");
        if (!st2.classList.contains("hidden")) {
            const pass = document.getElementById("new-admin-pass").value.trim();
            if(pass.length < 4) return alert("Contraseña muy corta");
            users.find(u => u.username === "admin").password = pass;
            saveUsers(); alert("Clave cambiada."); location.reload();
        } else if(ph === masterPhone) {
            st2.classList.remove("hidden"); document.getElementById("btn-verify-phone").innerText = "Guardar";
        } else alert("Número incorrecto");
    };

    // --- TECLA ENTER Y EVENTOS ---
    const init = () => {
        document.getElementById("btn-login").onclick = handleLogin;
        document.getElementById("btn-search").onclick = handleSearch;
        const enter = (e) => { if(e.key === "Enter") handleLogin(); };
        document.getElementById("login-user").onkeypress = enter;
        document.getElementById("login-pass").onkeypress = enter;
        document.getElementById("search-text").onkeypress = (e) => { if(e.key === "Enter") handleSearch(); };
        
        document.getElementById("btn-logout").onclick = () => { addLog("Salió"); localStorage.removeItem("isLogged"); location.reload(); };
        document.getElementById("btn-list").onclick = () => { renderList(departamentos); addLog("Listó todos"); };
        document.getElementById("btn-empty").onclick = () => { renderList(departamentos.filter(d => !d.Inquilino || d.Inquilino === "-")); addLog("Vio vacíos"); };
        document.getElementById("btn-clear").onclick = () => { document.getElementById("search-text").value = ""; document.getElementById("list").innerHTML = ""; addLog("Limpió pantalla"); };
        document.getElementById("btn-add").onclick = () => { editIndex = -1; document.querySelectorAll(".form-body input").forEach(i => i.value=""); document.getElementById("modal-form").classList.remove("hidden"); };
        document.getElementById("btn-cancel").onclick = () => document.getElementById("modal-form").classList.add("hidden");
        document.getElementById("btn-close-users").onclick = () => document.getElementById("modal-users-list").classList.add("hidden");
        document.getElementById("btn-close-recover").onclick = () => document.getElementById("modal-recover").classList.add("hidden");
        
        document.getElementById("btn-export-log").onclick = () => {
            const b = new Blob([(JSON.parse(localStorage.getItem("app_logs")) || []).join("\n")], {type:'text/plain'});
            const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "Log_Sistema.txt"; a.click();
        };

        document.getElementById("btn-manage-users").onclick = () => {
            document.getElementById("users-admin-list").innerHTML = users.map((u, i) => `
                <div class="user-row">
                    <b>${u.username}</b> (${u.role}) ${u.username !== 'admin' ? `<button onclick="delUsr(${i})">X</button>` : ''}
                    <br><small>Clave: ${u.password}</small>
                </div>`).join('');
            document.getElementById("modal-users-list").classList.remove("hidden");
        };

        document.getElementById("btn-delete-db").onclick = () => {
            if(prompt("Pass Admin:") === currentUser.password) { departamentos = []; saveData(); renderList([]); addLog("BORRÓ BASE COMPLETA"); }
        };

        document.getElementById("mode-toggle").onchange = (e) => document.body.classList.toggle("dark-mode", e.target.checked);
        document.getElementById("log-toggle").onchange = (e) => document.getElementById("log-container").classList.toggle("hidden", !e.target.checked);
    };

    window.delUsr = (i) => { users.splice(i,1); saveUsers(); document.getElementById("btn-manage-users").onclick(); };
    document.getElementById("btn-save-user").onclick = () => {
        const n = document.getElementById("u-name").value, p = document.getElementById("u-pass").value, r = document.getElementById("u-role").value;
        if(n && p) { users.push({username:n, password:p, role:r}); saveUsers(); document.getElementById("btn-manage-users").onclick(); }
    };

    if(currentUser) {
        document.getElementById("current-user-display").innerText = currentUser.username;
        document.getElementById("session-label").innerText = currentUser.role === "admin" ? "Admin" : "Usuario";
        if(currentUser.role === "user") document.querySelectorAll(".admin-only").forEach(b => b.classList.add("hidden-role"));
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("main-screen").classList.remove("hidden");
        renderLogs();
    }
    init();
});