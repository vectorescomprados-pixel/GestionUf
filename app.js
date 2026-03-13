document.addEventListener("DOMContentLoaded", function() {
    // --- DATOS INICIALES ---
    let users = JSON.parse(localStorage.getItem("users")) || [{username:"admin", password:"admin", role:"admin"}];
    let departamentos = JSON.parse(localStorage.getItem("departamentos")) || [];
    let editIndex = -1;

    const saveData = () => localStorage.setItem("departamentos", JSON.stringify(departamentos));

    // --- MODO OSCURO/CLARO ---
    const modeToggle = document.getElementById("mode-toggle");
    modeToggle.onchange = () => {
        document.body.classList.toggle("dark-mode", modeToggle.checked);
        document.getElementById("mode-text").innerText = modeToggle.checked ? "Modo Oscuro" : "Modo Claro";
    };

    // --- MODAL (AGREGAR/EDITAR) ---
    const modal = document.getElementById("modal-form");
    document.getElementById("btn-add").onclick = () => {
        editIndex = -1;
        document.getElementById("modal-title").innerText = "Nuevo Registro";
        document.querySelectorAll("#modal-form input").forEach(i => i.value = "");
        modal.classList.remove("hidden");
    };

    window.editDept = (i) => {
        editIndex = i;
        const d = departamentos[i];
        document.getElementById("modal-title").innerText = "Editar Registro";
        document.getElementById("f-uf").value = d.UF || "";
        document.getElementById("f-prop").value = d.Propietario || "";
        document.getElementById("f-telp").value = d.TelefonoPropietario || "";
        document.getElementById("f-inq").value = d.Inquilino || "";
        document.getElementById("f-teli").value = d.TelefonoInquilino || "";
        modal.classList.remove("hidden");
    };

    document.getElementById("btn-cancel").onclick = () => modal.classList.add("hidden");

    document.getElementById("btn-save").onclick = () => {
        const ufVal = document.getElementById("f-uf").value.trim();
        if(!ufVal) return alert("La UF es obligatoria");

        const data = {
            UF: ufVal,
            Propietario: document.getElementById("f-prop").value.trim(),
            TelefonoPropietario: document.getElementById("f-telp").value.trim(),
            Inquilino: document.getElementById("f-inq").value.trim(),
            TelefonoInquilino: document.getElementById("f-teli").value.trim()
        };

        if(editIndex === -1) departamentos.push(data);
        else departamentos[editIndex] = data;

        saveData(); renderList();
        modal.classList.add("hidden");
    };

    // --- FUNCIONES DE LISTA ---
    window.renderList = (items = departamentos) => {
        const list = document.getElementById("list");
        list.innerHTML = items.length ? "" : "<p class='muted'>No hay registros</p>";
        
        items.forEach((d, i) => {
            const clean = (t) => t ? t.replace(/\D/g, '') : '';
            const div = document.createElement("div");
            div.className = "item";
            div.innerHTML = `
                <div style="float:right">
                    <button class="btn primary" style="padding:5px 10px" onclick="editDept(${i})">✏️</button>
                    <button class="btn danger" style="padding:5px 10px" onclick="deleteDept(${i})">🗑️</button>
                </div>
                <strong style="font-size:1.2em; color:#2563eb">UNIDAD: ${d.UF}</strong>
                <div style="margin-top:10px;">
                    <p><b>Propietario:</b> ${d.Propietario || "-"}<br>
                    <small class="muted">Tel: ${d.TelefonoPropietario || "-"}</small>
                    ${d.TelefonoPropietario ? `
                        <a href="tel:${clean(d.TelefonoPropietario)}" class="contact-link">📞</a>
                        <a href="https://wa.me/${clean(d.TelefonoPropietario)}" target="_blank" class="contact-link">💬</a>
                    ` : ''}</p>
                    
                    <p><b>Inquilino:</b> ${d.Inquilino || "-"}<br>
                    <small class="muted">Tel: ${d.TelefonoInquilino || "-"}</small>
                    ${d.TelefonoInquilino ? `
                        <a href="tel:${clean(d.TelefonoInquilino)}" class="contact-link">📞</a>
                        <a href="https://wa.me/${clean(d.TelefonoInquilino)}" target="_blank" class="contact-link">💬</a>
                    ` : ''}</p>
                </div>
            `;
            list.appendChild(div);
        });
    };

    // --- BUSCADOR, LOGIN Y OTROS ---
    document.getElementById("btn-search").onclick = () => {
        const text = document.getElementById("search-text").value.toLowerCase();
        const res = departamentos.filter(d => Object.values(d).some(v => String(v).toLowerCase().includes(text)));
        renderList(res);
    };

    document.getElementById("btn-clear").onclick = () => {
        document.getElementById("search-text").value = "";
        renderList();
    };

    document.getElementById("btn-login").onclick = () => {
        const u = document.getElementById("login-user").value;
        const p = document.getElementById("login-pass").value;
        const userFound = users.find(usr => usr.username === u && usr.password === p);
        if(userFound) {
            document.getElementById("current-user").innerText = u;
            document.getElementById("login-screen").classList.add("hidden");
            document.getElementById("main-screen").classList.remove("hidden");
            renderList();
        } else alert("Datos incorrectos");
    };

    document.getElementById("btn-recover").onclick = () => {
        if(prompt("Teléfono autorizado:") === "1131552679") {
            const np = prompt("Nueva clave admin:");
            if(np) { users[0].password = np; localStorage.setItem("users", JSON.stringify(users)); alert("OK"); }
        }
    };

    document.getElementById("btn-export").onclick = () => {
        let csv = "UF,Propietario,TelProp,Inquilino,TelInq\n";
        departamentos.forEach(d => csv += `${d.UF},${d.Propietario},${d.TelefonoPropietario},${d.Inquilino},${d.TelefonoInquilino}\n`);
        const blob = new Blob([csv], {type: 'text/csv'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'base.csv';
        a.click();
    };

    document.getElementById("btn-import").onclick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.onchange = e => {
            const reader = new FileReader();
            reader.readAsText(e.target.files[0]);
            reader.onload = r => {
                const rows = r.target.result.split('\n').slice(1);
                rows.forEach(row => {
                    const c = row.split(',');
                    if(c[0]) departamentos.push({UF:c[0], Propietario:c[1], TelefonoPropietario:c[2], Inquilino:c[3], TelefonoInquilino:c[4]});
                });
                saveData(); renderList(); alert("Importado");
            };
        };
        input.click();
    };

    document.getElementById("btn-delete-db").onclick = () => {
        if(prompt("Clave Admin:") === users[0].password) {
            if(confirm("¿BORRAR TODO?")) { departamentos = []; saveData(); renderList(); }
        }
    };

    window.deleteDept = (i) => { if(confirm("¿Eliminar?")) { departamentos.splice(i,1); saveData(); renderList(); } };
    document.getElementById("btn-list").onclick = () => renderList();
    document.getElementById("btn-empty").onclick = () => renderList(departamentos.filter(d => !d.Inquilino || d.Inquilino === "-"));
    document.getElementById("btn-logout").onclick = () => location.reload();
});