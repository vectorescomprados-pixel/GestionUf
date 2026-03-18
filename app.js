import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, updateDoc, doc, deleteDoc, orderBy, limit, where, getDocs, writeBatch } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// CONFIGURACIÓN OBTENIDA DE TU CONSOLA
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

let departamentos = [];
let currentUser = JSON.parse(localStorage.getItem("isLogged"));
let editId = null;

const showToast = (msj) => {
    const t = document.createElement("div"); t.id = "toast"; t.innerText = msj;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2500);
};

// --- MIGRACIÓN DE DATOS VIEJOS (Solo tú la verás la primera vez) ---
const checkMigration = async () => {
    const localData = JSON.parse(localStorage.getItem("departamentos"));
    if (localData && localData.length > 0) {
        if (confirm(`Detecté ${localData.length} registros en este equipo. ¿Deseas subirlos a la nube ahora?`)) {
            showToast("Subiendo datos...");
            const batch = writeBatch(db);
            localData.forEach(d => {
                const newDoc = doc(collection(db, "departamentos"));
                batch.set(newDoc, d);
            });
            await batch.commit();
            localStorage.removeItem("departamentos"); // Limpiamos para no repetir
            showToast("✅ ¡Datos en la nube!");
        }
    }
};

const addCloudLog = async (action) => {
    if (!currentUser) return;
    await addDoc(collection(db, "logs"), {
        user: currentUser.username,
        action: action,
        date: new Date().toLocaleDateString(),
        timestamp: Date.now()
    });
};

const listenData = () => {
    onSnapshot(collection(db, "departamentos"), (snapshot) => {
        departamentos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderList(departamentos);
    });
};

const listenLogs = () => {
    const hoy = new Date().toLocaleDateString();
    const q = query(collection(db, "logs"), where("date", "==", hoy), orderBy("timestamp", "desc"), limit(15));
    onSnapshot(q, (snapshot) => {
        const div = document.getElementById("log-list");
        if(div) {
            div.innerHTML = snapshot.docs.map(d => {
                const data = d.data();
                const h = new Date(data.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
                return `<p style="font-size:10px; border-bottom:1px solid rgba(120,120,120,0.1); margin:4px 0;"><b>${h}</b> ${data.user}: ${data.action}</p>`;
            }).join('');
        }
    });
};

window.renderList = (items) => {
    const listDiv = document.getElementById("list");
    listDiv.innerHTML = items.length ? "" : "<p style='text-align:center; padding:20px; opacity:0.5'>Sin datos</p>";
    items.forEach(d => {
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
                    <button class="btn primary" onclick="window.editDept('${d.id}')">Editar</button>
                    <button class="btn danger" onclick="window.deleteDept('${d.id}', '${d.UF}')">Borrar</button>
                </div>
            </div>
            <p><b>Prop:</b> ${d.Propietario || "-"}</p>
            <div class="phone-line"><small>${d.TelefonoPropietario || "Sin número"}</small>
                <div class="icon-links">${pT ? `<a href="tel:${pT}"><i class="fas fa-phone"></i></a> <a href="https://wa.me/${pT}" target="_blank"><i class="fab fa-whatsapp"></i></a>` : ""}</div>
            </div>
            <p style="margin-top:10px"><b>Inq:</b> ${d.Inquilino || "-"}</p>
            <div class="phone-line"><small>${d.TelefonoInquilino || "Sin número"}</small>
                <div class="icon-links">${iT ? `<a href="tel:${iT}"><i class="fas fa-phone"></i></a> <a href="https://wa.me/${iT}" target="_blank"><i class="fab fa-whatsapp"></i></a>` : ""}</div>
            </div>
            ${sinTel ? '<span class="warning-tag">⚠️ CARGAR CONTACTO</span>' : ''}
        `;
        listDiv.appendChild(div);
    });
};

window.editDept = (id) => {
    const d = departamentos.find(x => x.id === id);
    editId = id;
    document.getElementById("f-uf").value = d.UF;
    document.getElementById("f-prop").value = d.Propietario;
    document.getElementById("f-telp").value = d.TelefonoPropietario;
    document.getElementById("f-inq").value = d.Inquilino;
    document.getElementById("f-teli").value = d.TelefonoInquilino;
    document.getElementById("modal-form").classList.remove("hidden");
};

window.deleteDept = async (id, uf) => {
    if(confirm(`¿Borrar UF ${uf}?`)) {
        await deleteDoc(doc(db, "departamentos", id));
        addCloudLog(`Eliminó UF ${uf}`);
    }
};

// LOGIN
document.getElementById("btn-login").onclick = () => {
    const u = document.getElementById("login-user").value;
    const p = document.getElementById("login-pass").value;
    if(u === "admin" && p === "admin") {
        localStorage.setItem("isLogged", JSON.stringify({username: u, role: "admin"}));
        location.reload();
    } else { alert("Clave incorrecta"); }
};

if(currentUser) {
    document.getElementById("login-screen").classList.add("hidden");
    document.getElementById("main-screen").classList.remove("hidden");
    document.getElementById("current-user-display").innerText = currentUser.username;
    
    checkMigration(); // Ejecuta migración si hay datos viejos en el navegador
    listenData();
    listenLogs();

    document.getElementById("btn-save").onclick = async () => {
        const d = { UF: document.getElementById("f-uf").value, Propietario: document.getElementById("f-prop").value, TelefonoPropietario: document.getElementById("f-telp").value, Inquilino: document.getElementById("f-inq").value, TelefonoInquilino: document.getElementById("f-teli").value };
        if(editId) {
            await updateDoc(doc(db, "departamentos", editId), d);
            addCloudLog(`Editó UF ${d.UF}`);
        } else {
            await addDoc(collection(db, "departamentos"), d);
            addCloudLog(`Agregó UF ${d.UF}`);
        }
        document.getElementById("modal-form").classList.add("hidden");
    };

    document.getElementById("btn-logout").onclick = () => { localStorage.removeItem("isLogged"); location.reload(); };
    document.getElementById("btn-add").onclick = () => { editId = null; document.querySelectorAll("#modal-form input").forEach(i => i.value=""); document.getElementById("modal-form").classList.remove("hidden"); };
    document.getElementById("btn-cancel").onclick = () => document.getElementById("modal-form").classList.add("hidden");
    document.getElementById("btn-list").onclick = () => renderList(departamentos);
    document.getElementById("btn-search").onclick = () => {
        const t = document.getElementById("search-text").value.toLowerCase();
        renderList(departamentos.filter(d => Object.values(d).some(v => String(v).toLowerCase().includes(t))));
    };
}