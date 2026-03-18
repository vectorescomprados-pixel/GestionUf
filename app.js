import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, updateDoc, doc, deleteDoc, orderBy, limit, writeBatch, serverTimestamp, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDxw26xM3pliNxo79LdvWkr0uOGdvCgiIo", authDomain: "gestionuf-remoto.firebaseapp.com",
    projectId: "gestionuf-remoto", storageBucket: "gestionuf-remoto.firebasestorage.app",
    messagingSenderId: "724452752860", appId: "1:724452752860:web:4d25585addcdcbd146e319"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", () => {
    let departamentos = [];
    let editId = null;
    let currentUser = JSON.parse(localStorage.getItem("isLogged"));

    const renderList = (items) => {
        const listDiv = document.getElementById("list");
        listDiv.innerHTML = ""; // <--- EVITA TRIPLICADOS
        items.forEach(d => {
            const hasTel = (d.TelefonoPropietario || d.TelefonoInquilino);
            const tel = d.TelefonoPropietario || d.TelefonoInquilino || "";
            const wp = tel.replace(/\D/g,'');
            
            const div = document.createElement("div");
            div.className = `item ${!hasTel ? 'empty' : ''}`;
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between">
                    <b style="color:var(--primary)">UF ${d.UF}</b>
                    <div style="display:flex; gap:15px">
                        <i class="fas fa-edit" onclick="window.editUF('${d.id}')"></i>
                        <i class="fas fa-trash admin-only" style="color:var(--danger)" onclick="window.deleteUF('${d.id}', '${d.UF}')"></i>
                    </div>
                </div>
                <div style="font-size:14px; margin:10px 0">
                    <p>Prop: ${d.Propietario || "-"}</p>
                    <p>Inq: ${d.Inquilino || "-"}</p>
                </div>
                ${!hasTel ? '<b style="color:#f59e0b; font-size:11px">⚠️ CARGAR CONTACTO</b>' : ''}
                <div class="action-bar ${!hasTel ? 'hidden' : ''}">
                    <a href="tel:${tel}" class="action-btn primary"><i class="fas fa-phone"></i></a>
                    <a href="https://wa.me/${wp}?text=Hola" target="_blank" class="action-btn success" style="background:#25d366"><i class="fab fa-whatsapp"></i></a>
                </div>
            `;
            listDiv.appendChild(div);
        });
    };

    // --- FUNCIONES CORE ---
    window.deleteUF = async (id, uf) => {
        if(prompt("Ingrese clave para borrar UF " + uf) === currentUser.password) {
            await deleteDoc(doc(db, "departamentos", id));
            addLog("Eliminó UF " + uf);
        }
    };

    document.getElementById("btn-delete-all").onclick = async () => {
        if(confirm("¿BORRAR TODA LA BASE?") && prompt("Confirme con su clave:") === currentUser.password) {
            const snap = await getDocs(collection(db, "departamentos"));
            const batch = writeBatch(db);
            snap.forEach(d => batch.delete(d.ref));
            await batch.commit();
            addLog("BORRADO TOTAL DE BASE");
        }
    };

    document.getElementById("btn-add").onclick = () => {
        editId = null;
        document.querySelectorAll("#modal-form input").forEach(i => i.value = "");
        document.getElementById("modal-form").classList.remove("hidden");
    };

    document.getElementById("btn-clear").onclick = () => {
        document.getElementById("search-text").value = "";
        renderList(departamentos);
    };

    document.getElementById("btn-list-empty").onclick = () => {
        renderList(departamentos.filter(d => !d.TelefonoPropietario && !d.TelefonoInquilino));
    };

    // --- LOGS ---
    const addLog = async (msg) => {
        await addDoc(collection(db, "app_logs"), {
            time: new Date().toLocaleTimeString(), user: currentUser.username, action: msg, timestamp: serverTimestamp()
        });
    };
    document.getElementById("btn-toggle-log").onclick = () => document.getElementById("log-container").classList.toggle("hidden");

    // --- COHETE ---
    const rocket = document.getElementById("btn-rocket");
    window.onscroll = () => rocket.style.display = window.scrollY > 300 ? "block" : "none";
    rocket.onclick = () => window.scrollTo({top: 0, behavior: 'smooth'});

    // --- LOGIN Y CARGA ---
    const login = () => {
        const u = document.getElementById("login-user").value, p = document.getElementById("login-pass").value;
        if(u === "admin" && p === "admin") { // Ejemplo simple
            localStorage.setItem("isLogged", JSON.stringify({username:u, password:p, role:"admin"}));
            location.reload();
        }
    };
    document.getElementById("btn-login").onclick = login;
    document.getElementById("login-pass").onkeypress = (e) => { if(e.key === "Enter") login(); };

    if(currentUser) {
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("main-screen").classList.remove("hidden");
        onSnapshot(query(collection(db, "departamentos"), orderBy("UF", "asc")), (snap) => {
            departamentos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            renderList(departamentos);
        });
        onSnapshot(query(collection(db, "app_logs"), orderBy("timestamp", "desc"), limit(10)), (snap) => {
            document.getElementById("log-list").innerHTML = snap.docs.map(d => `<div>[${d.data().time}] ${d.data().action}</div>`).join('');
        });
    }

    // BOTONES MODALES
    document.getElementById("btn-cancel").onclick = () => document.getElementById("modal-form").classList.add("hidden");
    document.getElementById("btn-save").onclick = async () => {
        const data = {
            UF: document.getElementById("f-uf").value.padStart(4,'0'),
            Propietario: document.getElementById("f-prop").value, TelefonoPropietario: document.getElementById("f-telp").value,
            Inquilino: document.getElementById("f-inq").value, TelefonoInquilino: document.getElementById("f-teli").value
        };
        if(editId) await updateDoc(doc(db, "departamentos", editId), data);
        else await addDoc(collection(db, "departamentos"), data);
        document.getElementById("modal-form").classList.add("hidden");
        addLog("Guardó UF " + data.UF);
    };
    
    window.editUF = (id) => {
        const d = departamentos.find(x => x.id === id);
        editId = id;
        document.getElementById("f-uf").value = d.UF;
        document.getElementById("modal-form").classList.remove("hidden");
    };

    document.getElementById("btn-dark").onclick = () => document.body.classList.toggle("dark-mode");
    document.getElementById("btn-logout").onclick = () => { localStorage.removeItem("isLogged"); location.reload(); };
});