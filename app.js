import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, updateDoc, doc, deleteDoc, orderBy, limit, writeBatch, serverTimestamp, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

document.addEventListener("DOMContentLoaded", () => {
    let departamentos = [];
    let editId = null;
    let currentUser = JSON.parse(localStorage.getItem("isLogged"));
    let users = JSON.parse(localStorage.getItem("users")) || [{username:"admin", password:"admin", role:"admin"}];

    // --- SEGURIDAD ---
    const pedirClave = () => prompt("Ingrese su contraseña para autorizar:") === currentUser.password;

    const addCloudLog = async (msg) => {
        if (!currentUser) return;
        await addDoc(collection(db, "app_logs"), {
            time: new Date().toLocaleTimeString(),
            user: currentUser.username, action: msg, timestamp: serverTimestamp()
        });
    };

    // --- RENDERIZADO (LIMPIA TRIPICADOS) ---
    const renderList = (items) => {
        const listDiv = document.getElementById("list");
        listDiv.innerHTML = ""; 
        items.forEach(d => {
            const sinTel = (!d.TelefonoPropietario && !d.TelefonoInquilino);
            const div = document.createElement("div");
            div.className = `item ${sinTel ? 'empty' : ''}`;
            
            // Elegir el teléfono disponible para los botones
            const telLink = d.TelefonoPropietario || d.TelefonoInquilino || "";
            const wpNum = telLink.replace(/\D/g,'');
            const msgWp = encodeURIComponent(`Hola, me comunico de la Administración por la UF ${d.UF}...`);

            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center">
                    <b style="font-size:20px; color:var(--accent)">UF ${d.UF}</b>
                    <div style="display:flex; gap:15px">
                        <i class="fas fa-edit" style="font-size:22px" onclick="window.editUF('${d.id}')"></i>
                        <i class="fas fa-trash-alt admin-only" style="font-size:22px; color:var(--danger)" onclick="window.deleteUF('${d.id}', '${d.UF}')"></i>
                    </div>
                </div>
                <div style="margin:12px 0; font-size:16px">
                    <p style="margin:4px 0"><b>P:</b> ${d.Propietario || "-"}</p>
                    <p style="margin:4px 0"><b>I:</b> ${d.Inquilino || "-"}</p>
                </div>
                ${sinTel ? '<b style="color:#f59e0b; font-size:12px">⚠️ CARGAR CONTACTO</b>' : ''}
                <div class="action-bar">
                    <a href="tel:${telLink}" class="btn-call"><i class="fas fa-phone"></i></a>
                    <a href="https://wa.me/${wpNum}?text=${msgWp}" class="btn-whatsapp" target="_blank"><i class="fab fa-whatsapp"></i></a>
                </div>
            `;
            listDiv.appendChild(div);
        });
        if(currentUser?.role !== "admin") document.querySelectorAll(".admin-only").forEach(el => el.style.display = "none");
    };

    // --- ACCIONES ADMIN ---
    document.getElementById("btn-delete-all").onclick = async () => {
        if(confirm("¿BORRAR TODA LA BASE DE DATOS?") && pedirClave()) {
            const snap = await getDocs(collection(db, "departamentos"));
            const batch = writeBatch(db);
            snap.forEach(d => batch.delete(d.ref));
            await batch.commit();
            addCloudLog("BORRÓ TODA LA BASE");
        }
    };

    window.deleteUF = async (id, uf) => {
        if(pedirClave()) {
            await deleteDoc(doc(db, "departamentos", id));
            addCloudLog(`Eliminó UF ${uf}`);
        }
    };

    // --- LOGIN CON ENTER ---
    const ejecutarLogin = () => {
        const u = document.getElementById("login-user").value, p = document.getElementById("login-pass").value;
        const found = users.find(x => x.username === u && x.password === p);
        if(found) { localStorage.setItem("isLogged", JSON.stringify(found)); location.reload(); }
        else alert("Acceso denegado");
    };
    document.getElementById("btn-login").onclick = ejecutarLogin;
    document.getElementById("login-pass").onkeypress = (e) => { if(e.key === "Enter") ejecutarLogin(); };

    // --- CARGA FIREBASE ---
    const load = () => {
        onSnapshot(query(collection(db, "departamentos"), orderBy("UF", "asc")), (snap) => {
            departamentos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            renderList(departamentos);
        });
        onSnapshot(query(collection(db, "app_logs"), orderBy("timestamp", "desc"), limit(10)), (snap) => {
            document.getElementById("log-list").innerHTML = snap.docs.map(d => `<div>[${d.data().time}] ${d.data().user}: ${d.data().action}</div>`).join('');
        });
    };

    if(currentUser) {
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("main-screen").classList.remove("hidden");
        load();
    }

    // --- BOTONERA ---
    document.getElementById("btn-search").onclick = () => {
        const t = document.getElementById("search-text").value.toLowerCase();
        renderList(departamentos.filter(d => Object.values(d).some(v => String(v).toLowerCase().includes(t))));
    };
    document.getElementById("search-text").onkeypress = (e) => { if(e.key === "Enter") document.getElementById("btn-search").click(); };
    
    document.getElementById("btn-add").onclick = () => { editId = null; document.querySelectorAll("#modal-form input").forEach(i => i.value=""); document.getElementById("modal-form").classList.remove("hidden"); };
    document.getElementById("btn-cancel").onclick = () => document.getElementById("modal-form").classList.add("hidden");
    
    document.getElementById("btn-save").onclick = async () => {
        const data = {
            UF: document.getElementById("f-uf").value.padStart(4, '0'),
            Propietario: document.getElementById("f-prop").value, TelefonoPropietario: document.getElementById("f-telp").value,
            Inquilino: document.getElementById("f-inq").value, TelefonoInquilino: document.getElementById("f-teli").value
        };
        if(editId) await updateDoc(doc(db, "departamentos", editId), data);
        else await addDoc(collection(db, "departamentos"), data);
        document.getElementById("modal-form").classList.add("hidden");
        addCloudLog(`Guardó UF ${data.UF}`);
    };

    // GESTION USUARIOS (BOTON CERRAR REPARADO)
    document.getElementById("btn-users").onclick = () => {
        document.getElementById("users-admin-list").innerHTML = users.map(u => `<div><b>${u.username}</b> (${u.role})</div>`).join('');
        document.getElementById("modal-users").classList.remove("hidden");
    };
    document.getElementById("btn-close-users").onclick = () => document.getElementById("modal-users").classList.add("hidden");
    document.getElementById("btn-save-user").onclick = () => {
        const u = document.getElementById("u-name").value, p = document.getElementById("u-pass").value, r = document.getElementById("u-role").value;
        if(u && p) {
            users.push({username:u, password:p, role:r});
            localStorage.setItem("users", JSON.stringify(users));
            addCloudLog(`Creó usuario ${u}`);
            document.getElementById("modal-users").classList.add("hidden");
        }
    };

    document.getElementById("btn-logout").onclick = () => { localStorage.removeItem("isLogged"); location.reload(); };
    window.editUF = (id) => {
        const d = departamentos.find(x => x.id === id);
        editId = id;
        document.getElementById("f-uf").value = d.UF; document.getElementById("f-prop").value = d.Propietario;
        document.getElementById("f-telp").value = d.TelefonoPropietario; document.getElementById("f-inq").value = d.Inquilino;
        document.getElementById("f-teli").value = d.TelefonoInquilino;
        document.getElementById("modal-form").classList.remove("hidden");
    };
    
    document.getElementById("mode-toggle").onchange = (e) => document.body.classList.toggle("dark-mode", e.target.checked);
    document.getElementById("log-toggle").onchange = (e) => document.getElementById("log-container").classList.toggle("hidden", !e.target.checked);
});