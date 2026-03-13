document.addEventListener("DOMContentLoaded", function() {
    let users = JSON.parse(localStorage.getItem("users")) || [{username:"admin", password:"admin"}];
    let departamentos = JSON.parse(localStorage.getItem("departamentos")) || [];
    let editIndex = -1;

    const saveData = () => localStorage.setItem("departamentos", JSON.stringify(departamentos));

    // ENTER EN LOGIN
    ["login-user", "login-pass"].forEach(id => {
        document.getElementById(id).addEventListener("keypress", (e) => {
            if (e.key === "Enter") document.getElementById("btn-login").click();
        });
    });

    // MODO OSCURO
    const modeToggle = document.getElementById("mode-toggle");
    modeToggle.onchange = () => {
        document.body.classList.toggle("dark-mode", modeToggle.checked);
        document.getElementById("mode-text").innerText = modeToggle.checked ? "Modo Oscuro" : "Modo Claro";
    };

    // BÚSQUEDA
    document.getElementById("btn-search").onclick = () => {
        const text = document.getElementById("search-text").value.toLowerCase().trim();
        if(!text) return renderList(departamentos);
        let res = departamentos.filter(d => String(d.UF).toLowerCase() === text);
        if(res.length === 0) {
            res = departamentos.filter(d => 
                Object.values(d).some(v => String(v).toLowerCase().includes(text))
            );
        }
        renderList(res);
    };

    // RENDERIZADO (Aquí corregimos los iconos)
    window.renderList = (items = departamentos) => {
        const list = document.getElementById("list");
        list.innerHTML = items.length ? "" : "<p class='muted'>Sin resultados</p>";
        
        items.forEach((d) => {
            const realIdx = departamentos.findIndex(orig => orig === d);
            
            // Función mejorada para limpiar teléfonos (quita espacios, guiones, etc)
            const getCleanTel = (t) => {
                if(!t || t === "-" || t.trim() === "") return null;
                return t.replace(/\D/g, ''); 
            };

            const telProp = getCleanTel(d.TelefonoPropietario);
            const telInq = getCleanTel(d.TelefonoInquilino);

            const div = document.createElement("div");
            div.className = "item";
            div.innerHTML = `
                <div class="item-actions">
                    <button class="btn primary" style="padding:4px 8px" onclick="editDept(${realIdx})">Editar</button>
                    <button class="btn danger" style="padding:4px 8px" onclick="deleteDept(${realIdx})">X</button>
                </div>
                <strong style="color:#2563eb; font-size:1.1em">UF: ${d.UF}</strong><br>
                
                <b>Prop:</b> ${d.Propietario || "-"}<br>
                <small class="muted">Tel: ${d.TelefonoPropietario || "-"}</small>
                ${telProp ? `
                    <a href="tel:${telProp}" class="contact-link" title="Llamar">📞</a>
                    <a href="https://wa.me/${telProp}" target="_blank" class="contact-link" title="WhatsApp">💬</a>
                ` : ''}<br>

                <b>Inq:</b> ${d.Inquilino || "-"}<br>
                <small class="muted">Tel: ${d.TelefonoInquilino || "-"}</small>
                ${telInq ? `
                    <a href="tel:${telInq}" class="contact-link" title="Llamar">📞</a>
                    <a href="https://wa.me/${telInq}" target="_blank" class="contact-link" title="WhatsApp">💬</a>
                ` : ''}
            `;
            list.appendChild(div);
        });
    };

    // MODAL Y DEMÁS FUNCIONES
    const modal = document.getElementById("modal-form");
    window.editDept = (idx) => {
        editIndex = idx;
        const d = departamentos[idx];
        document.getElementById("modal-title").innerText = "Editar Registro";
        document.getElementById("f-uf").value = d.UF || "";
        document.getElementById("f-prop").value = d.Propietario || "";
        document.getElementById("f-telp").value = d.TelefonoPropietario || "";
        document.getElementById("f-inq").value = d.Inquilino || "";
        document.getElementById("f-teli").value = d.TelefonoInquilino || "";
        modal.classList.remove("hidden");
    };

    document.getElementById("btn-save").onclick = () => {
        const data = {
            UF: document.getElementById("f-uf").value.trim(),
            Propietario: document.getElementById("f-prop").value.trim(),
            TelefonoPropietario: document.getElementById("f-telp").value.trim(),
            Inquilino: document.getElementById("f-inq").value.trim(),
            TelefonoInquilino: document.getElementById("f-teli").value.trim()
        };
        if(!data.UF) return alert("UF obligatoria");
        if(editIndex === -1) departamentos.push(data);
        else departamentos[editIndex] = data;
        saveData(); renderList(departamentos); modal.classList.add("hidden");
    };

    document.getElementById("btn-add").onclick = () => {
        editIndex = -1;
        document.querySelectorAll(".form-body input").forEach(i => i.value = "");
        modal.classList.remove("hidden");
    };

    document.getElementById("btn-cancel").onclick = () => modal.classList.add("hidden");
    document.getElementById("btn-clear").onclick = () => { 
        document.getElementById("search-text").value = ""; 
        renderList(departamentos); 
    };

    document.getElementById("btn-login").onclick = () => {
        const u = document.getElementById("login-user").value;
        const p = document.getElementById("login-pass").value;
        if(users.some(usr => usr.username === u && usr.password === p)) {
            document.getElementById("current-user").innerText = u;
            document.getElementById("login-screen").classList.add("hidden");
            document.getElementById("main-screen").classList.remove("hidden");
            renderList();
        } else alert("Acceso denegado");
    };

    window.deleteDept = (i) => { if(confirm("¿Eliminar?")) { departamentos.splice(i,1); saveData(); renderList(); } };
    document.getElementById("btn-list").onclick = () => renderList();
    document.getElementById("btn-empty").onclick = () => renderList(departamentos.filter(d => !d.Inquilino || d.Inquilino === "-"));
    document.getElementById("btn-logout").onclick = () => location.reload();
});