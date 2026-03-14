document.addEventListener("DOMContentLoaded", function() {
    const masterPhone = "1131552679";
    let users = JSON.parse(localStorage.getItem("users")) || [{username:"admin", password:"admin", role:"admin"}];
    let departamentos = JSON.parse(localStorage.getItem("departamentos")) || [];
    let editIndex = -1;
    let currentUser = JSON.parse(localStorage.getItem("isLogged"));

    const saveData = () => localStorage.setItem("departamentos", JSON.stringify(departamentos));
    const saveUsers = () => localStorage.setItem("users", JSON.stringify(users));

    // AVISOS VISUALES (TOASTS)
    const showToast = (msj) => {
        const toast = document.createElement("div");
        toast.id = "toast";
        toast.innerText = msj;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2500);
    };

    // LOGS DIARIOS
    const addLog = (msg) => {
        if (!currentUser) return;
        const logs = JSON.parse(localStorage.getItem("app_logs")) || [];
        const entry = { date: new Date().toLocaleDateString(), time: new Date().toLocaleTimeString(), user: currentUser.username, action: msg };
        logs.unshift(entry);
        localStorage.setItem("app_logs", JSON.stringify(logs.slice(0, 500)));
        renderLogs();
    };

    const renderLogs = () => {
        const div = document.getElementById("log-list");
        if(div) {
            const logs = JSON.parse(localStorage.getItem("app_logs")) || [];
            const hoy = new Date().toLocaleDateString();
            const logsHoy = logs.filter(l => l.date === hoy);
            div.innerHTML = logsHoy.length 
                ? logsHoy.map(l => `<p style="margin:4px 0; border-bottom:1px solid rgba(120,120,120,0.1); font-size:10px;"><b>${l.time}</b>: ${l.action}</p>`).join('')
                : "<p style='opacity:0.5; font-size:10px;'>Sin actividad hoy</p>";
        }
    };

    const showProgress = (show) => {
        document.getElementById("progress-container").classList.toggle("hidden", !show);
        document.getElementById("progress-text").classList.toggle("hidden", !show);
    };

    const updateProgress = (p, text) => {
        document.getElementById("progress-bar").style.width = p + "%";
        document.getElementById("progress-text").innerText = text;
    };

    const init = () => {
        // EVENTO ENTER
        const enterHandler = (e, btnId) => { if(e.key === "Enter") document.getElementById(btnId).click(); };
        document.getElementById("login-pass").onkeydown = (e) => enterHandler(e, "btn-login");
        document.getElementById("search-text").onkeydown = (e) => enterHandler(e, "btn-search");

        // LOGIN Y LOGOUT
        document.getElementById("btn-login").onclick = () => {
            const u = document.getElementById("login-user").value, p = document.getElementById("login-pass").value;
            const found = users.find(x => x.username === u && x.password === p);
            if(found) { localStorage.setItem("isLogged", JSON.stringify(found)); location.reload(); } else alert("Credenciales inválidas");
        };
        document.getElementById("btn-logout").onclick = () => { addLog("Cerró sesión"); localStorage.removeItem("isLogged"); location.reload(); };

        // GESTION CUENTAS
        document.getElementById("btn-manage-users").onclick = () => {
            document.getElementById("users-admin-list").innerHTML = users.map((u, i) => `
                <div style="display:flex; justify-content:space-between; padding:8px; border-bottom:1px solid var(--border)">
                    <span>${u.username} (${u.role})</span>
                    ${u.username !== 'admin' ? `<button class="btn danger" onclick="delUsr(${i})" style="padding:2px 5px">X</button>` : ''}
                </div>`).join('');
            document.getElementById("modal-users-list").classList.remove("hidden");
        };
        document.getElementById("btn-close-users").onclick = () => document.getElementById("modal-users-list").classList.add("hidden");
        document.getElementById("btn-save-user").onclick = () => {
            const n = document.getElementById("u-name").value, p = document.getElementById("u-pass").value, r = document.getElementById("u-role").value;
            if(n && p) { users.push({username:n, password:p, role:r}); saveUsers(); showToast("Cuenta creada"); document.getElementById("btn-manage-users").click(); }
        };

        // EXPORTAR CON FECHA
        document.getElementById("btn-export").onclick = () => {
            if(!departamentos.length) return alert("Base vacía");
            const fecha = new Date().toLocaleDateString().replace(/\//g, '-');
            let csv = "UF;Propietario;TelP;Inquilino;TelI\n" + departamentos.map(d => `${d.UF};${d.Propietario};${d.TelefonoPropietario};${d.Inquilino};${d.TelefonoInquilino}`).join("\n");
            const blob = new Blob(["\uFEFF" + csv], {type: 'text/csv;charset=utf-8;'});
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `Base_UF_${fecha}.csv`; link.click();
            addLog("Exportó base CSV");
        };

        // BAJAR LOG CON FECHA
        document.getElementById("btn-export-log").onclick = () => {
            const logs = JSON.parse(localStorage.getItem("app_logs")) || [];
            const fecha = new Date().toLocaleDateString().replace(/\//g, '-');
            const txt = logs.map(l => `${l.date} ${l.time} - ${l.user}: ${l.action}`).join("\r\n");
            const blob = new Blob([txt], {type: 'text/plain'});
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `Log_Actividad_${fecha}.txt`; link.click();
        };

        // RESTAURAR PROTEGIDO
        document.getElementById("btn-restore").onclick = () => {
            const r = localStorage.getItem("respaldo_base");
            if(!r) return alert("No se realizó ninguna modificación previa o no existe respaldo.");
            const pass = prompt("CONTRASEÑA ADMIN:");
            if(pass === currentUser.password) {
                departamentos = JSON.parse(r); saveData(); renderList(departamentos);
                addLog("Restauró copia de seguridad");
                showToast("✅ Base restaurada");
            } else if(pass) alert("Clave incorrecta");
        };

        // BUSQUEDA
        document.getElementById("btn-search").onclick = () => {
            const t = document.getElementById("search-text").value.toLowerCase();
            const res = departamentos.filter(d => Object.values(d).some(v => String(v).toLowerCase().includes(t)));
            renderList(res); addLog(`Buscó: ${t}`);
        };
        document.getElementById("btn-clear").onclick = () => { document.getElementById("search-text").value = ""; document.getElementById("list").innerHTML = ""; };
        document.getElementById("btn-list").onclick = () => { renderList(departamentos); addLog("Listó todo"); };
        document.getElementById("btn-empty").onclick = () => { renderList(departamentos.filter(d => !d.Inquilino || d.Inquilino === "-")); addLog("Filtró vacíos"); };

        // IMPORTAR
        document.getElementById("btn-import").onclick = () => document.getElementById("csv-file").click();
        document.getElementById("csv-file").onchange = (e) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const lines = ev.target.result.split(/\r?\n/).filter(l => l.trim() !== "");
                localStorage.setItem("respaldo_base", JSON.stringify(departamentos));
                showProgress(true);
                for(let i=1; i < lines.length; i++) {
                    const c = lines[i].split(";");
                    if(c.length >= 5) departamentos.push({ UF:c[0], Propietario:c[1], TelefonoPropietario:c[2], Inquilino:c[3], TelefonoInquilino:c[4] });
                    updateProgress((i/(lines.length-1))*100, "Importando...");
                }
                saveData(); renderList(departamentos); addLog("Importó CSV");
                setTimeout(() => { showProgress(false); showToast("Importación finalizada"); }, 800);
            };
            reader.readAsText(e.target.files[0]);
        };

        // BORRAR TODO
        document.getElementById("btn-delete-db").onclick = () => {
            const pass = prompt("CLAVE PARA BORRAR:");
            if(pass === currentUser.password) {
                localStorage.setItem("respaldo_base", JSON.stringify(departamentos));
                departamentos = []; saveData(); renderList([]); addLog("BORRÓ BASE COMPLETA");
                showToast("Base vaciada");
            }
        };

        // FORMULARIO UF
        document.getElementById("btn-add").onclick = () => { editIndex = -1; document.querySelectorAll("#modal-form input").forEach(i => i.value=""); document.getElementById("modal-form").classList.remove("hidden"); };
        document.getElementById("btn-cancel").onclick = () => document.getElementById("modal-form").classList.add("hidden");
        document.getElementById("btn-save").onclick = () => {
            const d = { UF: document.getElementById("f-uf").value, Propietario: document.getElementById("f-prop").value, TelefonoPropietario: document.getElementById("f-telp").value, Inquilino: document.getElementById("f-inq").value, TelefonoInquilino: document.getElementById("f-teli").value };
            if(editIndex === -1) { departamentos.push(d); addLog(`Agregó UF: ${d.UF}`); showToast("✅ UF Creada"); } 
            else { departamentos[editIndex] = d; addLog(`Editó UF: ${d.UF}`); showToast("✅ Cambios guardados"); }
            saveData(); renderList(departamentos); document.getElementById("modal-form").classList.add("hidden");
        };

        // RECUPERAR
        document.getElementById("btn-recover").onclick = () => document.getElementById("modal-recover").classList.remove("hidden");
        document.getElementById("btn-verify-phone").onclick = () => {
            const ph = document.getElementById("recover-phone").value.trim();
            if (ph === masterPhone) {
                document.getElementById("recover-step-2").classList.remove("hidden");
                const newPass = document.getElementById("new-admin-pass").value;
                if(newPass) { users.find(u => u.username === "admin").password = newPass; saveUsers(); alert("Clave reseteada"); location.reload(); }
            } else alert("Error de celular");
        };
    };

    window.delUsr = (i) => { users.splice(i,1); saveUsers(); document.getElementById("btn-manage-users").onclick(); };
    window.editDept = (i) => { editIndex = i; const d = departamentos[i]; document.getElementById("f-uf").value = d.UF; document.getElementById("f-prop").value = d.Propietario; document.getElementById("f-telp").value = d.TelefonoPropietario; document.getElementById("f-inq").value = d.Inquilino; document.getElementById("f-teli").value = d.TelefonoInquilino; document.getElementById("modal-form").classList.remove("hidden"); };
    window.deleteDept = (i) => { if(confirm("¿Borrar?")) { const uf = departamentos[i].UF; addLog(`Eliminó UF: ${uf}`); departamentos.splice(i,1); saveData(); renderList(departamentos); showToast(`🗑️ UF ${uf} eliminada`); } };

    window.renderList = (items) => {
        const listDiv = document.getElementById("list");
        listDiv.innerHTML = items.length ? "" : "<p style='text-align:center; padding:20px; opacity:0.5'>Sin resultados</p>";
        items.forEach(d => {
            const idx = departamentos.findIndex(o => o === d);
            const pT = d.TelefonoPropietario?.replace(/\D/g, '');
            const iT = d.TelefonoInquilino?.replace(/\D/g, '');
            const sinTel = (!pT && !iT);
            const div = document.createElement("div");
            div.className = "item";
            if(sinTel) div.style.borderColor = "var(--warning)";
            div.innerHTML = `
                <div class="item-header">
                    <strong>UF: ${d.UF}</strong>
                    <div class="header-actions">
                        <button class="btn primary" onclick="editDept(${idx})" style="padding:4px 8px; font-size:11px">Editar</button>
                        <button class="btn danger" onclick="deleteDept(${idx})" style="padding:4px 8px; font-size:11px">Borrar</button>
                    </div>
                </div>
                <p><b>Prop:</b> ${d.Propietario || "-"}</p>
                <div class="phone-line">
                    <small>${d.TelefonoPropietario || "Sin número"}</small>
                    <div class="icon-links">${pT ? `<a href="tel:${pT}"><i class="fas fa-phone"></i></a> <a href="https://wa.me/${pT}" target="_blank"><i class="fab fa-whatsapp"></i></a>` : ""}</div>
                </div>
                <p style="margin-top:10px"><b>Inq:</b> ${d.Inquilino || "-"}</p>
                <div class="phone-line">
                    <small>${d.TelefonoInquilino || "Sin número"}</small>
                    <div class="icon-links">${iT ? `<a href="tel:${iT}"><i class="fas fa-phone"></i></a> <a href="https://wa.me/${iT}" target="_blank"><i class="fab fa-whatsapp"></i></a>` : ""}</div>
                </div>
                ${sinTel ? '<span class="warning-tag">⚠️ CARGAR CONTACTO</span>' : ''}
            `;
            listDiv.appendChild(div);
        });
    };

    if(currentUser) {
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("main-screen").classList.remove("hidden");
        document.getElementById("current-user-display").innerText = currentUser.username;
        
        // BIENVENIDA
        const welcome = document.createElement("div");
        welcome.className = "welcome-msg";
        welcome.innerHTML = `<h3>¡Bienvenido, ${currentUser.username}!</h3><p>Gestión del día: ${new Date().toLocaleDateString()}</p>`;
        const h = document.querySelector("#main-screen header");
        h.parentNode.insertBefore(welcome, h.nextSibling);
        setTimeout(() => welcome.remove(), 4000);

        if(currentUser.role !== "admin") document.querySelectorAll(".admin-only").forEach(el => el.style.display = "none");
        renderLogs();
    }
    init();
});