import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, updateDoc, doc, deleteDoc, orderBy, getDocs, writeBatch, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = { /* Tu configuración igual */ };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- ACTIVAR MODO OFFLINE ---
enableIndexedDbPersistence(db).catch((err) => {
    console.error("Error modo offline:", err.code);
});

document.addEventListener("DOMContentLoaded", () => {
    let departamentos = [];
    let editId = null;

    // --- DETECTOR DE CONEXIÓN ---
    const updateConnUI = () => {
        const status = document.getElementById("conn-status");
        if(navigator.onLine) {
            status.innerHTML = "● APP EN LÍNEA";
            status.className = "status-bar online";
        } else {
            status.innerHTML = "○ TRABAJANDO SIN CONEXIÓN";
            status.className = "status-bar offline";
        }
    };
    window.addEventListener('online', updateConnUI);
    window.addEventListener('offline', updateConnUI);
    updateConnUI();

    // --- LOGIN ---
    const btnLogin = document.getElementById("btn-login");
    btnLogin.onclick = () => {
        const u = document.getElementById("login-user").value;
        const p = document.getElementById("login-pass").value;
        if(u === "admin" && p === "admin") {
            localStorage.setItem("uf_auth", "true");
            location.reload();
        } else { alert("Error de acceso"); }
    };

    if(localStorage.getItem("uf_auth") === "true") {
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("main-screen").classList.remove("hidden");

        // Escucha en tiempo real (funciona offline gracias a la persistencia)
        onSnapshot(query(collection(db, "departamentos"), orderBy("UF", "asc")), (snap) => {
            departamentos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            render(departamentos);
        }, (err) => {
            console.log("Error de red, usando cache local");
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
                            <i class="fas fa-trash" style="color:var(--danger); cursor:pointer" onclick="window.deleteUF('${d.id}')"></i>
                        </div>
                    </div>
                    <div style="font-size:13px; margin:8px 0">
                        <p><b>P:</b> ${d.Propietario || "-"}</p>
                        <p><b>I:</b> ${d.Inquilino || "-"}</p>
                    </div>
                    ${sinTel ? `<div style="color:var(--warning); font-weight:bold; font-size:11px">⚠️ CARGAR CONTACTO</div>` : ''}
                    <div class="action-bar ${sinTel ? 'hidden' : ''}">
                        <a href="tel:${tel}" class="btn primary" style="flex:1"><i class="fas fa-phone"></i></a>
                        <a href="https://wa.me/${tel.replace(/\D/g,'')}" target="_blank" class="btn" style="flex:1; background:#25d366"><i class="fab fa-whatsapp"></i></a>
                    </div>
                `;
                list.appendChild(div);
            });
        }

        // CRUD y demás funciones (se sincronizan solas al detectar internet)
        document.getElementById("btn-save").onclick = async () => {
            const data = {
                UF: document.getElementById("f-uf").value,
                Propietario: document.getElementById("f-prop").value,
                TelefonoPropietario: document.getElementById("f-telp").value,
                Inquilino: document.getElementById("f-inq").value,
                TelefonoInquilino: document.getElementById("f-teli").value
            };
            if(editId) await updateDoc(doc(db, "departamentos", editId), data);
            else await addDoc(collection(db, "departamentos"), data);
            document.getElementById("modal-form").classList.add("hidden");
        };

        window.editUF = (id) => {
            const d = departamentos.find(x => x.id === id);
            editId = id;
            document.getElementById("f-uf").value = d.UF;
            document.getElementById("f-prop").value = d.Propietario;
            document.getElementById("f-telp").value = d.TelefonoPropietario;
            document.getElementById("f-inq").value = d.Inquilino;
            document.getElementById("f-teli").value = d.TelefonoInquilino;
            document.getElementById("modal-form").classList.remove("hidden");
        };

        window.deleteUF = async (id) => { if(confirm("¿Borrar?") && prompt("Clave:") === "admin") await deleteDoc(doc(db, "departamentos", id)); };
    }
});