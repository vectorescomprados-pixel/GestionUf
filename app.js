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

    // --- SCROLL Y COHETE ---
    const rocket = document.getElementById("btn-rocket");
    window.onscroll = () => rocket.style.display = (window.scrollY > 300) ? "block" : "none";
    rocket.onclick = () => window.scrollTo({top: 0, behavior: 'smooth'});

    // --- IMPORTADOR (Lee ; y ,) ---
    document.getElementById("btn-import").onclick = () => document.getElementById("csv-file").click();
    document.getElementById("csv-file").onchange = (e) => {
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const content = ev.target.result;
            const delimiter = content.includes(";") ? ";" : ",";
            const rows = content.split("\n").slice(1);
            const batch = writeBatch(db);
            let count = 0;
            rows.forEach(row => {
                const c = row.split(delimiter);
                if(c.length >= 5 && c[0].trim() !== "") {
                    const ref = doc(collection(db, "departamentos"));
                    batch.set(ref, { 
                        UF: c[0].trim().padStart(4, '0'),
                        Propietario: c[1]?.trim() || "", 
                        TelefonoPropietario: c[2]?.trim() || "", 
                        Inquilino: c[3]?.trim() || "", 
                        TelefonoInquilino: c[4]?.trim() || "" 
                    });
                    count++;
                }
            });
            await batch.commit();
            showToast(`¡${count} UFs en la nube!`);
        };
        reader.readAsText(e.target.files[0]);
    };

    // --- LOGS ---
    const addLog = async (msg) => {
        if (!currentUser) return;
        await addDoc(collection(db, "app_logs"), {
            time: new Date().toLocaleTimeString(),
            user: currentUser.username, action: msg, timestamp: Date.now()
        });
    };

    const renderLogs = () => {
        onSnapshot(query(collection(db, "app_logs"), orderBy("timestamp", "desc"), limit(20)), (snap) => {
            document.getElementById("log-list").innerHTML = snap.docs.map(d => `<p style="margin:2px 0; border-bottom:1px solid rgba(120,120,120,0.1)"><b>${d.data().time}</b> ${d.data().user}: ${d.data().action}</p>`).join('');
        });
    };

    // --- DATA ---
    const listenData = () => {
        onSnapshot(query(collection(db, "departamentos"), orderBy("UF", "asc")), (snap) => {
            departamentos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            renderList(departamentos);
        });
    };

    const renderList = (items) => {
        const listDiv = document.getElementById("list");
        listDiv.innerHTML = items.map(d => `
            <div class="item">
                <div class="item-header"><strong>UF: ${d.UF}</strong>
                    <div><button class="btn primary" style="padding:4px 8px" onclick="window.editDept('${d.id}')">E</button>
                    <button class="btn danger admin-only" style="padding:4px 8px" onclick="window.deleteDept('${d.id}', '${d.UF}')">B</button></div>
                </div>
                <p style="margin:2px 0; font-size:13px"><b>P:</b> ${d.Propietario || "-"} | ${d.TelefonoPropietario || ""}</p>
                <p style="margin:2px 0; font-size:13px"><b>I:</b> ${d.Inquilino || "-"} | ${d.TelefonoInquilino || ""}</p>
            </div>`).join('');
        if(currentUser?.role !== "admin") document.querySelectorAll(".admin-only").forEach(el => el.style.display = "none");
    };

    // --- BOTONES ---
    document.getElementById("btn-clear").onclick = () => {
        document.getElementById("search-text").value = "";
        renderList(departamentos);
        window.scrollTo({top: 0, behavior: 'smooth'});
    };

    document.getElementById("btn-list-empty").onclick = () => {
        const empty = departamentos.filter(d => !d.TelefonoPropietario && !d.TelefonoInquilino);
        renderList(empty);
    };

    window.editDept = (id) => {
        const d = departamentos.find(x => x.id === id);
        editId = id;
        ["f-uf", "f-prop", "f-telp", "f-inq", "f-teli"].forEach((f, i) => document.getElementById(f).value = Object.values(d)[i+1] || "");
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
        addLog(`Guardó UF ${d.UF}`);
    };

    // --- LOGIN / UI ---
    document.getElementById("btn-login").onclick = () => {
        const u = document.getElementById("login-user").value, p = document.getElementById("login-pass").value;
        const found = users.find(x => x.username === u && x.password === p);
        if(found) { localStorage.setItem("isLogged", JSON.stringify(found)); location.reload(); } else alert("Error");
    };

    if(currentUser) {
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("main-screen").classList.remove("hidden");
        document.getElementById("current-user-display").innerText = currentUser.username;
        listenData(); renderLogs();
    }

    document.getElementById("btn-logout").onclick = () => { localStorage.removeItem("isLogged"); location.reload(); };
    document.getElementById("mode-toggle").onchange = (e) => document.body.classList.toggle("dark-mode", e.target.checked);
    document.getElementById("log-toggle").onchange = (e) => document.getElementById("log-container").classList.toggle("hidden", !e.target.checked);
    document.getElementById("btn-add").onclick = () => { editId = null; document.getElementById("modal-form").classList.remove("hidden"); document.querySelectorAll("#modal-form input").forEach(i => i.value=""); };
    document.getElementById("btn-cancel").onclick = () => document.getElementById("modal-form").classList.add("hidden");
    document.getElementById("btn-search").onclick = () => {
        const t = document.getElementById("search-text").value.toLowerCase();
        renderList(departamentos.filter(d => Object.values(d).some(v => String(v).toLowerCase().includes(t))));
    };
});