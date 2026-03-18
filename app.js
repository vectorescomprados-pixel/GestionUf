import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, updateDoc, doc, deleteDoc, orderBy, getDocs, writeBatch, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = { 
    apiKey: "AIzaSyDxw26xM3pliNxo79LdvWkr0uOGdvCgiIo", authDomain: "gestionuf-remoto.firebaseapp.com",
    projectId: "gestionuf-remoto", storageBucket: "gestionuf-remoto.firebasestorage.app",
    messagingSenderId: "724452752860", appId: "1:724452752860:web:4d25585addcdcbd146e319"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Habilitar persistencia offline (Para Android/Celulares)
enableIndexedDbPersistence(db).catch(err => console.error("Error offline:", err.code));

document.addEventListener("DOMContentLoaded", () => {
    let departamentos = [];
    let editId = null;
    let pendingAction = null;
    const adminTel = "123456789"; // Cambia por tu número real

    const writeLog = (msg) => {
        const lp = document.getElementById("log-panel");
        if(lp) {
            lp.innerHTML += `<div>[${new Date().toLocaleTimeString()}] ${msg}</div>`;
            lp.scrollTop = lp.scrollHeight;
        }
    };

    // --- INDICADOR ONLINE/OFFLINE ---
    const updateConn = () => {
        const s = document.getElementById("conn-status");
        if(!s) return;
        s.innerHTML = navigator.onLine ? "● APP EN LÍNEA" : "○ TRABAJANDO SIN CONEXIÓN";
        s.className = navigator.onLine ? "status-bar online" : "status-bar offline";
    };
    window.addEventListener('online', updateConn); window.addEventListener('offline', updateConn);
    updateConn();

    // --- LÓGICA DE LOGIN (CON ENTER Y BOTÓN) ---
    const doLogin = () => {
        const u = document.getElementById("login-user").value;
        const p = document.getElementById("login-pass").value;
        if(u === "admin" && p === "admin") {
            localStorage.setItem("uf_auth", "true");
            location.reload();
        } else {
            alert("Usuario o clave incorrecta");
        }
    };

    if(document.getElementById("btn-login")) {
        document.getElementById("btn-login").onclick = doLogin;
        document.getElementById("login-pass").onkeypress = (e) => { if(e.key === "Enter") doLogin(); };
    }

    // --- LÓGICA DE RECUPERACIÓN ---
    if(document.getElementById("btn-recover-open")) {
        document.getElementById("btn-recover-open").onclick = () => document.getElementById("modal-recover").classList.remove("hidden");
        document.getElementById("btn-close-rec").onclick = () => document.getElementById("modal-recover").classList.add("hidden");
        
        document.getElementById("btn-verify-tel").onclick = () => {
            if(document.getElementById("rec-tel").value === adminTel) {
                document.getElementById("step-1").classList.add("hidden");
                document.getElementById("step-2").classList.remove("hidden");
            } else { alert("Número incorrecto"); }
        };

        document.getElementById("btn-save-pass").onclick = () => {
            const newP = document.getElementById("new-pass").value;
            if(newP.length >= 4) {
                alert("Nueva clave establecida: " + newP);
                document.getElementById("modal-recover").classList.add("hidden");
            } else { alert("Mínimo 4 caracteres"); }
        };
    }

    // --- PANTALLA PRINCIPAL ---
    if(localStorage.getItem("uf_auth") === "true") {
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("main-screen").classList.remove("hidden");
        writeLog("Sistema listo.");

        onSnapshot(query(collection(db, "departamentos"), orderBy("UF", "asc")), (snap) => {
            departamentos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            render(departamentos);
        });

        function render(data) {
            const list = document.getElementById("list");
            list.innerHTML = "";
            data.forEach(d => {
                const sinT = !d.TelefonoPropietario && !d.TelefonoInquilino;
                const tel = d.TelefonoPropietario || d.TelefonoInquilino || "";
                const div = document.createElement("div");
                div.className = `item ${sinT ? 'no-phone' : ''}`;
                div.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center">
                        <b style="color:var(--primary); font-size:18px">UF ${d.UF}</b>
                        <div>
                            <i class="fas fa-edit" style="margin-right:15px; cursor:pointer" onclick="window.editUF('${d.id}')"></i>
                            <i class="fas fa-trash" style="color:var(--danger); cursor:pointer" onclick="window.askConfirm('Borrar UF ${d.UF}', 'delete', '${d.id}')"></i>
                        </div>
                    </div>
                    <div style="font-size:13px; margin:8px 0">
                        <p><b>P:</b> ${d.Propietario || "-"}</p>
                        <p><b>I:</b> ${d.Inquilino || "-"}</p>
                    </div>
                    ${sinT ? `<div style="color:var(--warning); font-weight:bold; font-size:11px">⚠️ CARGAR CONTACTO</div>` : ''}
                    <div class="action-bar ${sinT ? 'hidden' : ''}" style="display:flex; gap:10px; margin-top:10px">
                        <a href="tel:${tel}" class="btn primary" style="flex:1; text-decoration:none"><i class="fas fa-phone"></i></a>
                        <a href="https://wa.me/${tel.replace(/\D/g,'')}" target="_blank" class="btn" style="flex:1; background:#25d366; text-decoration:none"><i class="fab fa-whatsapp"></i></a>
                    </div>
                `;
                list.appendChild(div);
            });
        }

        // --- FUNCIONES GLOBALES ---
        window.editUF = (id) => {
            const d = departamentos.find(x => x.id === id);
            editId = id;
            document.getElementById("form-title").innerText = "Editar UF " + d.UF;
            document.getElementById("f-uf").value = d.UF;
            document.getElementById("f-prop").value = d.Propietario || "";
            document.getElementById("f-telp").value = d.TelefonoPropietario || "";
            document.getElementById("f-inq").value = d.Inquilino || "";
            document.getElementById("f-teli").value = d.TelefonoInquilino || "";
            document.getElementById("modal-form").classList.remove("hidden");
        };

        window.askConfirm = (msg, type, id = null) => {
            pendingAction = { type, id };
            document.getElementById("confirm-msg").innerText = msg;
            document.getElementById("confirm-pass").value = "";
            document.getElementById("modal-confirm").classList.remove("hidden");
        };

        // --- BOTONES ---
        document.getElementById("btn-add").onclick = () => {
            editId = null;
            document.getElementById("form-title").innerText = "Nueva UF";
            document.querySelectorAll("#modal-form input").forEach(i => i.value = "");
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
            if(editId) {
                await updateDoc(doc(db, "departamentos", editId), data);
                writeLog(`UF ${data.UF} editada.`);
            } else {
                await addDoc(collection(db, "departamentos"), data);
                writeLog(`UF ${data.UF} creada.`);
            }
            document.getElementById("modal-form").classList.add("hidden");
        };

        document.getElementById("btn-confirm-yes").onclick = async () => {
            if(document.getElementById("confirm-pass").value !== "admin") return alert("Clave Incorrecta");
            if(pendingAction.type === 'delete') {
                await deleteDoc(doc(db, "departamentos", pendingAction.id));
                writeLog("Registro eliminado.");
            }
            if(pendingAction.type === 'deleteAll') {
                const snap = await getDocs(collection(db, "departamentos"));
                const batch = writeBatch(db);
                snap.forEach(d => batch.delete(d.ref));
                await batch.commit();
                writeLog("BASE DE DATOS VACIADA.");
            }
            document.getElementById("modal-confirm").classList.add("hidden");
        };

        document.getElementById("btn-search").onclick = () => {
            const v = document.getElementById("search-input").value.toLowerCase();
            render(departamentos.filter(d => d.UF.includes(v) || d.Propietario.toLowerCase().includes(v)));
            writeLog("Búsqueda realizada.");
        };

        document.getElementById("btn-clear").onclick = () => {
            document.getElementById("search-input").value = "";
            render(departamentos);
            writeLog("Vista restablecida.");
        };

        document.getElementById("btn-filter-empty").onclick = () => {
            render(departamentos.filter(d => !d.Inquilino || d.Inquilino.trim() === ""));
            writeLog("Filtro: UF desocupadas.");
        };

        // Otros eventos
        document.getElementById("btn-log-toggle").onclick = () => document.getElementById("log-panel").classList.toggle("hidden");
        document.getElementById("btn-theme").onclick = () => document.body.classList.toggle("dark-mode");
        document.getElementById("btn-logout").onclick = () => { localStorage.removeItem("uf_auth"); location.reload(); };
        document.getElementById("btn-cancel").onclick = () => document.getElementById("modal-form").classList.add("hidden");
        document.getElementById("btn-confirm-no").onclick = () => document.getElementById("modal-confirm").classList.add("hidden");
        document.getElementById("btn-delete-all").onclick = () => window.askConfirm("¿BORRAR TODA LA BASE?", "deleteAll");

        const rocket = document.getElementById("btn-rocket");
        window.onscroll = () => rocket.classList.toggle("hidden", window.scrollY < 300);
        rocket.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});