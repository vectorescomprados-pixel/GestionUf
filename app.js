import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, updateDoc, doc, deleteDoc, orderBy, limit, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
    const masterPhone = "1131552679";
    let departamentos = [];
    let editId = null;
    let currentUser = JSON.parse(localStorage.getItem("isLogged"));
    let users = JSON.parse(localStorage.getItem("users")) || [{username:"admin", password:"admin", role:"admin"}];

    // --- RENDERIZADO Y ESTADOS ---
    const renderList = (items) => {
        const listDiv = document.getElementById("list");
        listDiv.innerHTML = ""; // Limpieza para evitar triplicados
        items.forEach(d => {
            const sinTel = (!d.TelefonoPropietario && !d.TelefonoInquilino);
            const div = document.createElement("div");
            div.className = `item ${sinTel ? 'empty' : ''}`;
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center">
                    <b style="color:var(--primary)">UF ${d.UF}</b>
                    <div>
                        <button onclick="window.editUF('${d.id}')" style="background:none; border:none; font-size:18px">✏️</button>
                        <button onclick="window.deleteUF('${d.id}', '${d.UF}')" style="background:none; border:none; font-size:18px">🗑️</button>
                    </div>
                </div>
                <div style="font-size:13px; margin-top:5px">
                    <p style="margin:2px 0"><b>P:</b> ${d.Propietario || "-"} ${d.TelefonoPropietario ? '📞' : ''}</p>
                    <p style="margin:2px 0"><b>I:</b> ${d.Inquilino || "-"} ${d.TelefonoInquilino ? '📞' : ''}</p>
                </div>
                ${sinTel ? '<span class="warning-tag">⚠️ CARGAR CONTACTO</span>' : ''}
            `;
            listDiv.appendChild(div);
        });
        if(currentUser?.role !== "admin") document.querySelectorAll(".admin-only").forEach(el => el.style.display = "none");
    };

    const addCloudLog = async (msg) => {
        if (!currentUser) return;
        await addDoc(collection(db, "app_logs"), {
            time: new Date().toLocaleTimeString(),
            user: currentUser.username, action: msg, timestamp: serverTimestamp()
        });
    };

    // --- ACCIONES FIREBASE ---
    const loadData = () => {
        onSnapshot(query(collection(db, "departamentos"), orderBy("UF", "asc")), (snap) => {
            departamentos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            renderList(departamentos);
        });
        onSnapshot(query(collection(db, "app_logs"), orderBy("timestamp", "desc"), limit(20)), (snap) => {
            document.getElementById("log-list").innerHTML = snap.docs.map(d => `<p style="margin:2px 0; border-bottom:1px solid var(--border)"><b>${d.data().time}</b> ${d.data().user}: ${d.data().action}</p>`).join('');
        });
    };

    // --- IMPORTADOR ---
    document.getElementById("btn-import").onclick = () => document.getElementById("csv-file").click();
    document.getElementById("csv-file").onchange = async (e) => {
        const text = await e.target.files[0].text();
        const delim = text.includes(";") ? ";" : ",";
        const rows = text.split("\n").slice(1);
        const batch = writeBatch(db);
        rows.forEach(row => {
            const c = row.split(delim);
            if(c[0]) {
                const ref = doc(collection(db, "departamentos"));
                batch.set(ref, {
                    UF: c[0].trim().padStart(4, '0'),
                    Propietario: c[1]?.trim() || "", TelefonoPropietario: c[2]?.trim() || "",
                    Inquilino: c[3]?.trim() || "", TelefonoInquilino: c[4]?.trim() || ""
                });
            }
        });
        await batch.commit();
        addCloudLog("Importó base de datos CSV");
    };

    // --- FUNCIONES GLOBALES ---
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

    window.deleteUF = async (id, uf) => {
        if(confirm(`¿Borrar UF ${uf}?`)) {
            await deleteDoc(doc(db, "departamentos", id));
            addCloudLog(`Eliminó UF ${uf}`);
        }
    };

    // --- EVENTOS ---
    document.getElementById("btn-save").onclick = async () => {
        const data = {
            UF: document.getElementById("f-uf").value.padStart(4, '0'),
            Propietario: document.getElementById("f-prop").value, TelefonoPropietario: document.getElementById("f-telp").value,
            Inquilino: document.getElementById("f-inq").value, TelefonoInquilino: document.getElementById("f-teli").value
        };
        if(editId) await updateDoc(doc(db, "departamentos", editId), data);
        else await addDoc(collection(db, "departamentos"), data);
        document.getElementById("modal-form").classList.add("hidden");
        addCloudLog(`Guardó/Editó UF ${data.UF}`);
    };

    document.getElementById("btn-search").onclick = () => {
        const t = document.getElementById("search-text").value.toLowerCase();
        renderList(departamentos.filter(d => Object.values(d).some(v => String(v).toLowerCase().includes(t))));
    };

    document.getElementById("search-text").onkeypress = (e) => { if(e.key === "Enter") document.getElementById("btn-search").click(); };
    document.getElementById("btn-clear").onclick = () => { document.getElementById("search-text").value = ""; renderList(departamentos); window.scrollTo({top:0, behavior:'smooth'}); };
    document.getElementById("btn-list-empty").onclick = () => renderList(departamentos.filter(d => !d.TelefonoPropietario && !d.TelefonoInquilino));
    
    document.getElementById("btn-add").onclick = () => { editId = null; document.getElementById("modal-form").classList.remove("hidden"); document.querySelectorAll("#modal-form input").forEach(i => i.value=""); };
    document.getElementById("btn-cancel").onclick = () => document.getElementById("modal-form").classList.add("hidden");
    document.getElementById("btn-logout").onclick = () => { localStorage.removeItem("isLogged"); location.reload(); };

    // --- LOGIN ---
    document.getElementById("btn-login").onclick = () => {
        const u = document.getElementById("login-user").value, p = document.getElementById("login-pass").value;
        const found = users.find(x => x.username === u && x.password === p);
        if(found) { localStorage.setItem("isLogged", JSON.stringify(found)); location.reload(); } else alert("Error");
    };

    // --- MODALES EXTRA ---
    document.getElementById("btn-users").onclick = () => {
        document.getElementById("users-admin-list").innerHTML = users.map(u => `<div>${u.username} (${u.role})</div>`).join('');
        document.getElementById("modal-users-list").classList.remove("hidden");
    };
    document.getElementById("btn-close-users").onclick = () => document.getElementById("modal-users-list").classList.add("hidden");
    document.getElementById("btn-recover").onclick = () => document.getElementById("modal-recover").classList.remove("hidden");
    document.getElementById("btn-close-recover").onclick = () => document.getElementById("modal-recover").classList.add("hidden");
    document.getElementById("btn-verify-phone").onclick = () => {
        if(document.getElementById("recover-phone").value === masterPhone) {
            document.getElementById("recover-step-2").classList.remove("hidden");
            document.getElementById("btn-verify-phone").onclick = () => {
                users[0].password = document.getElementById("new-admin-pass").value;
                localStorage.setItem("users", JSON.stringify(users));
                alert("Clave Admin cambiada"); location.reload();
            };
        }
    };

    // --- INICIO ---
    if(currentUser) {
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("main-screen").classList.remove("hidden");
        loadData();
    }
    
    const rocket = document.getElementById("btn-rocket");
    window.onscroll = () => rocket.style.display = window.scrollY > 300 ? "block" : "none";
    rocket.onclick = () => window.scrollTo({top: 0, behavior: 'smooth'});
    document.getElementById("mode-toggle").onchange = (e) => document.body.classList.toggle("dark-mode", e.target.checked);
    document.getElementById("log-toggle").onchange = (e) => document.getElementById("log-container").classList.toggle("hidden", !e.target.checked);
});