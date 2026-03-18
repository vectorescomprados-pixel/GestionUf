import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, updateDoc, doc, deleteDoc, orderBy, limit, where, getDocs, writeBatch } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

    // --- LOGS ---
    const addLog = async (msg) => {
        if (!currentUser) return;
        await addDoc(collection(db, "app_logs"), {
            time: new Date().toLocaleTimeString(),
            user: currentUser.username,
            action: msg,
            timestamp: Date.now()
        });
    };

    const renderLogs = () => {
        const q = query(collection(db, "app_logs"), orderBy("timestamp", "desc"), limit(30));
        onSnapshot(q, (snap) => {
            const div = document.getElementById("log-list");
            if(div) div.innerHTML = snap.docs.map(d => `<p style="font-size:10px; margin:4px 0; border-bottom:1px solid rgba(120,120,120,0.1)"><b>${d.data().time}</b> ${d.data().user}: ${d.data().action}</p>`).join('');
        });
    };

    // --- ESCUCHAR DATOS (ORDENADO 0001, 0002...) ---
    const listenData = () => {
        const q = query(collection(db, "departamentos"), orderBy("UF", "asc"));
        onSnapshot(q, (snapshot) => {
            departamentos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderList(departamentos);
        }, (error) => {
            document.getElementById("sync-status").innerText = "● MODO DESCONECTADO";
            document.getElementById("sync-status").style.color = "#ef4444";
        });
    };

    const renderList = (items) => {
        const listDiv = document.getElementById("list");
        listDiv.innerHTML = items.length ? "" : "<p style='text-align:center; padding:20px; opacity:0.5'>Sin registros</p>";
        
        items.forEach(d => {
            const pT = d.TelefonoPropietario?.replace(/\D/g, '');
            const iT = d.TelefonoInquilino?.replace(/\D/g, '');
            const sinTel = (!pT && !iT);
            const div = document.createElement("div");
            div.className = "item";
            if(sinTel) div.style.borderColor = "var(--warning)";
            div.innerHTML = `
                <div class="item-header"><strong>UF: ${d.UF}</strong>
                    <div><button class="btn primary" onclick="window.editDept('${d.id}')">Editar</button>
                    <button class="btn danger admin-only" onclick="window.deleteDept('${d.id}', '${d.UF}')">Borrar</button></div>
                </div>
                <p>Prop: ${d.Propietario || "-"}</p><p>Inq: ${d.Inquilino || "-"}</p>
            `;
            listDiv.appendChild(div);
        });
        if(currentUser?.role !== "admin") document.querySelectorAll(".admin-only").forEach(el => el.style.display = "none");
    };

    // --- FUNCIONES DE BOTONES ---
    document.getElementById("btn-clear-search").onclick = () => {
        document.getElementById("search-text").value = "";
        renderList(departamentos);
    };

    document.getElementById("btn-list-empty").onclick = () => {
        const empty = departamentos.filter(d => !d.TelefonoPropietario && !d.TelefonoInquilino);
        renderList(empty);
    };

    document.getElementById("btn-list").onclick = () => {
        document.getElementById("search-text").value = ""; // Clear al Ver Todos
        renderList(departamentos);
    };

    document.getElementById("btn-export").onclick = () => {
        let csv = "UF,Propietario,Tel Propietario,Inquilino,Tel Inquilino\n";
        departamentos.forEach(d => csv += `${d.UF},${d.Propietario},${d.TelefonoPropietario},${d.Inquilino},${d.TelefonoInquilino}\n`);
        const blob = new Blob([csv], {type: 'text/csv'});
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'GestionUF_Nube.csv'; a.click();
    };

    document.getElementById("btn-import").onclick = () => document.getElementById("csv-file").click();
    document.getElementById("csv-file").onchange = (e) => {
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const rows = ev.target.result.split("\n").slice(1);
            const batch = writeBatch(db);
            rows.forEach(row => {
                const c = row.split(",");
                if(c.length >= 5) {
                    const ref = doc(collection(db, "departamentos"));
                    batch.set(ref, { UF: c[0].trim(), Propietario: c[1].trim(), TelefonoPropietario: c[2].trim(), Inquilino: c[3].trim(), TelefonoInquilino: c[4].trim() });
                }
            });
            await batch.commit();
            showToast("Nube Actualizada");
        };
        reader.readAsText(e.target.files[0]);
    };

    // --- EVENTOS UI ---
    document.getElementById("mode-toggle").onchange = (e) => document.body.classList.toggle("dark-mode", e.target.checked);
    document.getElementById("log-toggle").onchange = (e) => document.getElementById("log-container").classList.toggle("hidden", !e.target.checked);

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

    document.getElementById("btn-save").onclick = async () => {
        const d = { UF: document.getElementById("f-uf").value, Propietario: document.getElementById("f-prop").value, TelefonoPropietario: document.getElementById("f-telp").value, Inquilino: document.getElementById("f-inq").value, TelefonoInquilino: document.getElementById("f-teli").value };
        editId ? await updateDoc(doc(db, "departamentos", editId), d) : await addDoc(collection(db, "departamentos"), d);
        document.getElementById("modal-form").classList.add("hidden");
        addLog(`${editId ? 'Editó' : 'Creó'} UF ${d.UF}`);
        editId = null;
    };

    // --- LOGIN ---
    document.getElementById("btn-login").onclick = () => {
        const u = document.getElementById("login-user").value;
        const p = document.getElementById("login-pass").value;
        const found = users.find(x => x.username === u && x.password === p);
        if(found) { localStorage.setItem("isLogged", JSON.stringify(found)); location.reload(); }
        else alert("Error");
    };

    if(currentUser) {
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("main-screen").classList.remove("hidden");
        document.getElementById("current-user-display").innerText = currentUser.username;
        listenData();
        renderLogs();
    }

    // Botones adicionales
    document.getElementById("btn-logout").onclick = () => { localStorage.removeItem("isLogged"); location.reload(); };
    document.getElementById("btn-add").onclick = () => { editId = null; document.getElementById("modal-form").classList.remove("hidden"); document.querySelectorAll("#modal-form input").forEach(i => i.value=""); };
    document.getElementById("btn-cancel").onclick = () => document.getElementById("modal-form").classList.add("hidden");
    document.getElementById("btn-search").onclick = () => {
        const t = document.getElementById("search-text").value.toLowerCase();
        renderList(departamentos.filter(d => Object.values(d).some(v => String(v).toLowerCase().includes(t))));
    };
});