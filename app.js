import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, updateDoc, doc, deleteDoc, orderBy, limit, writeBatch, serverTimestamp, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ... (Configuración Firebase igual) ...

document.addEventListener("DOMContentLoaded", () => {
    let departamentos = [];
    let editId = null; 
    let pendingAction = null;
    const adminTel = "1131552679"; // CAMBIA ESTO por tu número real para recuperar clave

    const writeLog = (msg) => {
        const logPanel = document.getElementById("log-panel");
        if(!logPanel) return;
        const time = new Date().toLocaleTimeString();
        logPanel.innerHTML += `<div>[${time}] ${msg}</div>`;
        logPanel.scrollTop = logPanel.scrollHeight;
    };

    // --- RECUPERAR CONTRASEÑA ---
    document.getElementById("btn-recover").onclick = () => {
        document.getElementById("modal-recover").classList.remove("hidden");
    };

    document.getElementById("btn-rec-verify").onclick = () => {
        const inputTel = document.getElementById("rec-tel").value;
        const stepNew = document.getElementById("step-new-pass");
        
        if (stepNew.classList.contains("hidden")) {
            if (inputTel === adminTel) {
                stepNew.classList.remove("hidden");
                document.getElementById("btn-rec-verify").innerText = "GUARDAR CLAVE";
                alert("Identidad verificada. Ingrese su nueva clave.");
            } else { alert("Número incorrecto."); }
        } else {
            const nueva = document.getElementById("new-pass").value;
            if(nueva.length < 4) return alert("Mínimo 4 caracteres");
            alert("Contraseña actualizada con éxito (Simulado: en producción requiere Auth de Firebase)");
            document.getElementById("modal-recover").classList.add("hidden");
            writeLog("Cambio de contraseña realizado.");
        }
    };
    document.getElementById("btn-rec-cancel").onclick = () => document.getElementById("modal-recover").classList.add("hidden");

    // --- INICIO DE SESIÓN ---
    const doLogin = () => {
        if(document.getElementById("login-user").value === "admin" && document.getElementById("login-pass").value === "admin") {
            localStorage.setItem("uf_auth", "true");
            location.reload();
        } else { alert("Error"); }
    };
    document.getElementById("btn-login").onclick = doLogin;
    document.getElementById("login-pass").onkeypress = (e) => { if(e.key === "Enter") doLogin(); };

    if(localStorage.getItem("uf_auth") === "true") {
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("main-screen").classList.remove("hidden");

        onSnapshot(query(collection(db, "departamentos"), orderBy("UF", "asc")), (snap) => {
            departamentos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            render(departamentos);
        });

        function render(data) {
            const list = document.getElementById("list");
            list.innerHTML = "";
            data.forEach(d => {
                const sinTel = !d.TelefonoPropietario && !d.TelefonoInquilino;
                const tel = d.TelefonoPropietario || d.TelefonoInquilino || "";
                const div = document.createElement("div");
                div.className = `item ${sinTel ? 'no-phone' : ''}`;
                div.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center">
                        <b style="color:var(--primary); font-size:18px">UF ${d.UF}</b>
                        <div>
                            <i class="fas fa-edit" style="margin-right:15px; cursor:pointer" onclick="window.editUF('${d.id}')"></i>
                            <i class="fas fa-trash" style="color:var(--danger); cursor:pointer" onclick="window.askConfirm('Borrar UF ${d.UF}', 'delete', '${d.id}')"></i>
                        </div>
                    </div>
                    <div style="font-size:13px; margin:10px 0">
                        <p style="margin:4px 0"><b>P:</b> ${d.Propietario || "-"}</p>
                        <p style="margin:4px 0"><b>I:</b> ${d.Inquilino || "-"}</p>
                    </div>
                    ${sinTel ? `<div style="color:var(--warning); font-weight:bold; font-size:11px"><i class="fas fa-exclamation-triangle"></i> CARGAR CONTACTO</div>` : ''}
                    <div class="action-bar ${sinTel ? 'hidden' : ''}">
                        <a href="tel:${tel}" class="action-btn" style="background:var(--primary)"><i class="fas fa-phone"></i></a>
                        <a href="https://wa.me/${tel.replace(/\D/g,'')}" target="_blank" class="action-btn" style="background:#25d366"><i class="fab fa-whatsapp"></i></a>
                    </div>
                `;
                list.appendChild(div);
            });
        }

        // --- CRUD CORREGIDO (NUEVA Y EDITAR) ---
        document.getElementById("btn-add").onclick = () => {
            editId = null; // Reset para que sea "Nueva"
            document.getElementById("form-title").innerText = "Nueva Unidad";
            document.querySelectorAll("#modal-form input").forEach(i => i.value = "");
            document.getElementById("modal-form").classList.remove("hidden");
        };

        window.editUF = (id) => {
            const d = departamentos.find(x => x.id === id);
            if(!d) return;
            editId = id; // Asignar ID para que sea "Editar"
            document.getElementById("form-title").innerText = "Editar Unidad " + d.UF;
            document.getElementById("f-uf").value = d.UF;
            document.getElementById("f-prop").value = d.Propietario || "";
            document.getElementById("f-telp").value = d.TelefonoPropietario || "";
            document.getElementById("f-inq").value = d.Inquilino || "";
            document.getElementById("f-teli").value = d.TelefonoInquilino || "";
            document.getElementById("modal-form").classList.remove("hidden");
        };

        document.getElementById("btn-save").onclick = async () => {
            const data = {
                UF: document.getElementById("f-uf").value,
                Propietario: document.getElementById("f-prop").value,
                TelefonoPropietario: document.getElementById("f-telp").value,
                Inquilino: document.getElementById("f-inq").value,
                TelefonoInquilino: document.getElementById("f-teli").value
            };

            try {
                if(editId) {
                    await updateDoc(doc(db, "departamentos", editId), data);
                    writeLog(`UF ${data.UF} editada.`);
                } else {
                    await addDoc(collection(db, "departamentos"), data);
                    writeLog(`Nueva UF ${data.UF} creada.`);
                }
                document.getElementById("modal-form").classList.add("hidden");
            } catch (e) { alert("Error al guardar"); }
        };

        // --- BOTONES DE BÚSQUEDA ---
        document.getElementById("btn-clear").onclick = () => {
            document.getElementById("search-input").value = "";
            render(departamentos);
            writeLog("Vista restablecida: Ver Todo.");
        };

        document.getElementById("btn-filter-empty").onclick = () => {
            render(departamentos.filter(d => !d.Inquilino || d.Inquilino.trim() === ""));
            writeLog("Filtro: Unidades vacías.");
        };

        // --- CONFIRMACIONES ---
        window.askConfirm = (msg, type, id = null) => {
            pendingAction = { type, id };
            document.getElementById("confirm-msg").innerText = msg;
            document.getElementById("confirm-pass").value = "";
            document.getElementById("modal-confirm").classList.remove("hidden");
        };

        document.getElementById("btn-confirm-yes").onclick = async () => {
            if(document.getElementById("confirm-pass").value !== "admin") return alert("Clave incorrecta");
            
            if(pendingAction.type === 'delete') {
                await deleteDoc(doc(db, "departamentos", pendingAction.id));
                writeLog("Registro eliminado.");
            } else if(pendingAction.type === 'export') {
                runExport();
            } else if(pendingAction.type === 'deleteAll') {
                const snap = await getDocs(collection(db, "departamentos"));
                const batch = writeBatch(db);
                snap.forEach(d => batch.delete(d.ref));
                await batch.commit();
                writeLog("BORRADO TOTAL DE BASE.");
            }
            document.getElementById("modal-confirm").classList.add("hidden");
        };

        // ... (Exportación e Importación se mantienen igual con sus respectivos writeLog) ...
    }
});