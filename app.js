import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, updateDoc, doc, deleteDoc, orderBy, getDocs, writeBatch, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = { 
    apiKey: "AIzaSyDxw26xM3pliNxo79LdvWkr0uOGdvCgiIo", 
    authDomain: "gestionuf-remoto.firebaseapp.com",
    projectId: "gestionuf-remoto", 
    storageBucket: "gestionuf-remoto.firebasestorage.app",
    messagingSenderId: "724452752860", 
    appId: "1:724452752860:web:4d25585addcdcbd146e319"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Persistencia para Android
enableIndexedDbPersistence(db).catch(() => console.log("Offline activo"));

// --- FUNCIONES DE INTERFAZ ---
const writeLog = (msg) => {
    const lp = document.getElementById("log-panel");
    if(lp) {
        lp.innerHTML += `<div>[${new Date().toLocaleTimeString()}] ${msg}</div>`;
        lp.scrollTop = lp.scrollHeight;
    }
};

const updateConn = () => {
    const s = document.getElementById("conn-status");
    if(!s) return;
    s.innerHTML = navigator.onLine ? "● APP EN LÍNEA" : "○ TRABAJANDO SIN CONEXIÓN";
    s.className = navigator.onLine ? "status-bar online" : "status-bar offline";
};

// --- LÓGICA DE LOGIN ---
const doLogin = () => {
    const u = document.getElementById("login-user").value;
    const p = document.getElementById("login-pass").value;
    if(u === "admin" && p === "admin") {
        localStorage.setItem("uf_auth", "true");
        window.location.reload();
    } else {
        alert("Usuario o clave incorrecta");
    }
};

// --- INICIALIZACIÓN ---
window.addEventListener('load', () => {
    updateConn();
    window.addEventListener('online', updateConn);
    window.addEventListener('offline', updateConn);

    // Asignar Login
    const btnLogin = document.getElementById("btn-login");
    if(btnLogin) {
        btnLogin.addEventListener('click', doLogin);
        document.getElementById("login-pass").addEventListener('keypress', (e) => {
            if(e.key === "Enter") doLogin();
        });
    }

    // Botón Recuperar
    document.getElementById("btn-recover-open").onclick = () => {
        document.getElementById("modal-recover").classList.remove("hidden");
    };
    document.getElementById("btn-close-rec").onclick = () => {
        document.getElementById("modal-recover").classList.add("hidden");
    };

    // Si está logueado, activar el resto
    if(localStorage.getItem("uf_auth") === "true") {
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("main-screen").classList.remove("hidden");
        
        // Cargar Datos
        let departamentos = [];
        onSnapshot(query(collection(db, "departamentos"), orderBy("UF", "asc")), (snap) => {
            departamentos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            render(departamentos);
        });

        // Función Renderizar
        const render = (data) => {
            const list = document.getElementById("list");
            list.innerHTML = "";
            data.forEach(d => {
                const sinT = !d.TelefonoPropietario && !d.TelefonoInquilino;
                const tel = d.TelefonoPropietario || d.TelefonoInquilino || "";
                const div = document.createElement("div");
                div.className = `item ${sinT ? 'no-phone' : ''}`;
                div.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center">
                        <b>UF ${d.UF}</b>
                        <div>
                            <i class="fas fa-edit" style="margin-right:15px; cursor:pointer" id="edit-${d.id}"></i>
                            <i class="fas fa-trash" style="color:var(--danger); cursor:pointer" id="del-${d.id}"></i>
                        </div>
                    </div>
                    <div style="font-size:13px; margin:8px 0">
                        <p>P: ${d.Propietario || "-"}</p>
                        <p>I: ${d.Inquilino || "-"}</p>
                    </div>
                    <div class="action-bar ${sinT ? 'hidden' : ''}" style="display:flex; gap:10px;">
                        <a href="tel:${tel}" class="btn primary" style="flex:1; text-decoration:none; height:35px"><i class="fas fa-phone"></i></a>
                        <a href="https://wa.me/${tel.replace(/\D/g,'')}" target="_blank" class="btn" style="flex:1; background:#25d366; text-decoration:none; height:35px"><i class="fab fa-whatsapp"></i></a>
                    </div>
                `;
                list.appendChild(div);

                // Asignar eventos a los iconos
                div.querySelector(`#edit-${d.id}`).onclick = () => window.editUF(d.id, departamentos);
                div.querySelector(`#del-${d.id}`).onclick = () => window.askConfirm(`¿Borrar UF ${d.UF}?`, 'delete', d.id);
            });
        };

        // Nueva UF
        document.getElementById("btn-add").onclick = () => {
            window.editId = null;
            document.getElementById("form-title").innerText = "Nueva UF";
            document.querySelectorAll("#modal-form input").forEach(i => i.value = "");
            document.getElementById("modal-form").classList.remove("hidden");
        };

        // Guardar
        document.getElementById("btn-save").onclick = async () => {
            const data = { 
                UF: document.getElementById("f-uf").value, 
                Propietario: document.getElementById("f-prop").value, 
                TelefonoPropietario: document.getElementById("f-telp").value,
                Inquilino: document.getElementById("f-inq").value,
                TelefonoInquilino: document.getElementById("f-teli").value
            };
            if(window.editId) await updateDoc(doc(db, "departamentos", window.editId), data);
            else await addDoc(collection(db, "departamentos"), data);
            document.getElementById("modal-form").classList.add("hidden");
            writeLog("Cambios guardados.");
        };

        // Cerrar Sesión
        document.getElementById("btn-logout").onclick = () => {
            localStorage.removeItem("uf_auth");
            window.location.reload();
        };

        // Otros botones
        document.getElementById("btn-theme").onclick = () => document.body.classList.toggle("dark-mode");
        document.getElementById("btn-cancel").onclick = () => document.getElementById("modal-form").classList.add("hidden");
        document.getElementById("btn-confirm-no").onclick = () => document.getElementById("modal-confirm").classList.add("hidden");
    }
});

// Funciones Globales para los iconos
window.editUF = (id, departamentos) => {
    const d = departamentos.find(x => x.id === id);
    window.editId = id;
    document.getElementById("form-title").innerText = "Editar UF " + d.UF;
    document.getElementById("f-uf").value = d.UF;
    document.getElementById("f-prop").value = d.Propietario || "";
    document.getElementById("f-telp").value = d.TelefonoPropietario || "";
    document.getElementById("f-inq").value = d.Inquilino || "";
    document.getElementById("f-teli").value = d.TelefonoInquilino || "";
    document.getElementById("modal-form").classList.remove("hidden");
};

window.askConfirm = (msg, type, id = null) => {
    window.pendingAction = { type, id };
    document.getElementById("confirm-msg").innerText = msg;
    document.getElementById("modal-confirm").classList.remove("hidden");
};