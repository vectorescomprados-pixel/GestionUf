import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, updateDoc, doc, deleteDoc, orderBy, limit, where, writeBatch } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

document.addEventListener("DOMContentLoaded", function() {
    const masterPhone = "1131552679";
    let users = JSON.parse(localStorage.getItem("users")) || [{username:"admin", password:"admin", role:"admin"}];
    let departamentos = [];
    let editId = null;
    let currentUser = JSON.parse(localStorage.getItem("isLogged"));

    const showToast = (msj) => {
        const t = document.createElement("div"); t.id = "toast"; t.innerText = msj;
        document.body.appendChild(t); setTimeout(() => t.remove(), 2500);
    };

    // --- LOGS EN LA NUBE ---
    const addLog = async (msg) => {
        if (!currentUser) return;
        await addDoc(collection(db, "app_logs"), {
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
            user: currentUser.username,
            action: msg,
            timestamp: Date.now()
        });
    };

    const renderLogs = () => {
        const q = query(collection(db, "app_logs"), orderBy("timestamp", "desc"), limit(50));
        onSnapshot(q, (snap) => {
            const div = document.getElementById("log-list");
            if(div) div.innerHTML = snap.docs.map(d => `<p style="font-size:10px; margin:4px 0; border-bottom:1px solid rgba(120,120,120,0.1)"><b>${d.data().time}</b> ${d.data().user}: ${d.data().action}</p>`).join('');
        });
    };

    // --- ESCUCHAR DATOS (ORDENADOS POR UF) ---
    const listenData = () => {
        // AQUÍ ESTÁ EL TRUCO DEL ORDEN: 0001, 0002...
        const q = query(collection(db, "departamentos"), orderBy("UF", "asc"));
        onSnapshot(q, (snapshot) => {
            departamentos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderList(departamentos);
        });
    };

    const renderList = (items) => {
        const listDiv = document.getElementById("list");
        listDiv.innerHTML = items.length ? "" : "<p style='text-align:center; padding:20px; opacity:0.5'>Sin datos en la nube</p>";
        
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
                        <button class="btn danger admin-only" onclick="window.deleteDept('${d.id}', '${d.UF}')">Borrar</button>
                    </div>
                </div>
                <p>Prop: ${d.Propietario || "-"}</p>
                <div class="phone-line"><small>${d.TelefonoPropietario || "Sin número"}</small>
                    <div class="icon-links">${pT ? `<a href="tel:${pT}"><i class="fas fa-phone"></i></a> <a href="https://wa.me/${pT}" target="_blank"><i class="fab fa-whatsapp"></i></a>` : ""}</div>
                </div>
                <p style="margin-top:10px">Inq: ${d.Inquilino || "-"}</p>
                <div class="phone-line"><small>${d.TelefonoInquilino || "Sin número"}</small>
                    <div class="icon-links">${iT ? `<a href="tel:${iT}"><i class="fas fa-phone"></i></a> <a href="https://wa.me/${iT}" target="_blank"><i class="fab fa-whatsapp"></i></a>` : ""}</div>
                </div>
            `;
            listDiv.appendChild(div);
        });
        if(currentUser?.role !== "admin") document.querySelectorAll(".admin-only").forEach(el => el.style.display = "none");
    };

    // --- IMPORTAR CSV A FIREBASE ---
    document.getElementById("btn-import").onclick = () => document.getElementById("csv-file").click();
    document.getElementById("csv-file").onchange = (e) => {
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const rows = ev.target.result.split("\n").slice(1);
            const batch = writeBatch(db);
            let count = 0;
            rows.forEach(row => {
                const cols = row.split(",");
                if(cols.length >= 5) {
                    const ref = doc(collection(db, "departamentos"));
                    batch.set(ref, { UF: cols[0].trim(), Propietario: cols[1].trim(), TelefonoPropietario: cols[2].trim(), Inquilino: cols[3].trim(), TelefonoInquilino: cols[4].trim() });
                    count++;
                }
            });
            await batch.commit();
            addLog(`Importó ${count} registros`);
            showToast(`Sincronizados ${count} registros`);
        };
        reader.readAsText(e.target.files[0]);
    };

    // --- FUNCIONES GLOBALES ---
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
            addLog(`Eliminó UF ${uf}`);
        }
    };

    // --- GUARDAR ---
    document.getElementById("btn-save").onclick = async () => {
        const d = { 
            UF: document.getElementById("f-uf").value, 
            Propietario: document.getElementById("f-prop").value, 
            TelefonoPropietario: document.getElementById("f-telp").value, 
            Inquilino: document.getElementById("f-inq").value, 
            TelefonoInquilino: document.getElementById("f-teli").value 
        };
        editId ? await updateDoc(doc(db, "departamentos", editId), d) : await addDoc(collection(db, "departamentos"), d);
        addLog(`${editId ? 'Editó' : 'Creó'} UF ${d.UF}`);
        document.getElementById("modal-form").classList.add("hidden");
        editId = null;
    };

    // --- UI Y LOGIN ---
    if(currentUser) {
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("main-screen").classList.remove("hidden");
        document.getElementById("current-user-display").innerText = currentUser.username;
        listenData();
        renderLogs();
    }

    document.getElementById("btn-login").onclick = () => {
        const u = document.getElementById("login-user").value;
        const p = document.getElementById("login-pass").value;
        const found = users.find(x => x.username === u && x.password === p);
        if(found) { localStorage.setItem("isLogged", JSON.stringify(found)); location.reload(); }
        else alert("Clave incorrecta");
    };

    document.getElementById("btn-logout").onclick = () => { localStorage.removeItem("isLogged"); location.reload(); };
    document.getElementById("btn-add").onclick = () => { editId = null; document.getElementById("modal-form").classList.remove("hidden"); document.querySelectorAll("#modal-form input").forEach(i => i.value=""); };
    document.getElementById("btn-cancel").onclick = () => document.getElementById("modal-form").classList.add("hidden");
    document.getElementById("btn-search").onclick = () => {
        const t = document.getElementById("search-text").value.toLowerCase();
        renderList(departamentos.filter(d => Object.values(d).some(v => String(v).toLowerCase().includes(t))));
    };
    document.getElementById("btn-list").onclick = () => renderList(departamentos);

    // Gestión de Usuarios (Local por ahora)
    document.getElementById("btn-users").onclick = () => {
        const list = document.getElementById("users-admin-list");
        list.innerHTML = users.map((u,i) => `<div>${u.username} (${u.role}) <button onclick="window.delUser(${i})">X</button></div>`).join('');
        document.getElementById("modal-users-list").classList.remove("hidden");
    };
    window.delUser = (i) => { users.splice(i,1); localStorage.setItem("users", JSON.stringify(users)); document.getElementById("btn-users").click(); };
    document.getElementById("btn-save-user").onclick = () => {
        users.push({username: document.getElementById("u-name").value, password: document.getElementById("u-pass").value, role: document.getElementById("u-role").value});
        localStorage.setItem("users", JSON.stringify(users));
        document.getElementById("btn-users").click();
    };
    document.getElementById("btn-close-users").onclick = () => document.getElementById("modal-users-list").classList.add("hidden");

    // Recuperar
    document.getElementById("btn-recover").onclick = () => document.getElementById("modal-recover").classList.remove("hidden");
    document.getElementById("btn-close-recover").onclick = () => document.getElementById("modal-recover").classList.add("hidden");
    document.getElementById("btn-verify-phone").onclick = () => {
        if(document.getElementById("recover-phone").value === masterPhone) {
            document.getElementById("recover-step-2").classList.remove("hidden");
            document.getElementById("btn-verify-phone").innerText = "Restablecer";
            document.getElementById("btn-verify-phone").onclick = () => {
                users[0].password = document.getElementById("new-admin-pass").value;
                localStorage.setItem("users", JSON.stringify(users));
                alert("Clave de admin restablecida");
                location.reload();
            };
        }
    };
});