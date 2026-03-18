import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, updateDoc, doc, deleteDoc, orderBy, limit, writeBatch } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
    let users = JSON.parse(localStorage.getItem("users")) || [{username:"admin", password:"admin", role:"admin"}];
    let departamentos = [];
    let editId = null;
    let currentUser = JSON.parse(localStorage.getItem("isLogged"));

    // --- COHETE ---
    const rocket = document.getElementById("btn-rocket");
    window.onscroll = () => rocket.style.display = window.scrollY > 300 ? "block" : "none";
    rocket.onclick = () => window.scrollTo({top: 0, behavior: 'smooth'});

    // --- IMPORTADOR INTELIGENTE (Detecta ; o , y normaliza UF) ---
    document.getElementById("btn-import").onclick = () => document.getElementById("csv-file").click();
    document.getElementById("csv-file").onchange = async (e) => {
        const file = e.target.files[0];
        const text = await file.text();
        const delim = text.includes(";") ? ";" : ",";
        const rows = text.split("\n").slice(1);
        const batch = writeBatch(db);

        rows.forEach(row => {
            const c = row.split(delim);
            if(c[0] && c[0].trim() !== "") {
                const ref = doc(collection(db, "departamentos"));
                batch.set(ref, {
                    UF: c[0].trim().padStart(4, '0'), // Convierte "1" en "0001"
                    Propietario: c[1]?.trim() || "",
                    TelefonoPropietario: c[2]?.trim() || "",
                    Inquilino: c[3]?.trim() || "",
                    TelefonoInquilino: c[4]?.trim() || ""
                });
            }
        });
        await batch.commit();
        alert("Sincronización Exitosa");
    };

    // --- RENDERIZADO ---
    const listenData = () => {
        onSnapshot(query(collection(db, "departamentos"), orderBy("UF", "asc")), (snap) => {
            departamentos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            renderList(departamentos);
        });
    };

    const renderList = (items) => {
        const listDiv = document.getElementById("list");
        listDiv.innerHTML = items.map(d => `
            <div class="item ${(!d.TelefonoPropietario && !d.TelefonoInquilino) ? 'empty' : ''}">
                <div style="display:flex; justify-content:space-between">
                    <strong style="color:var(--primary)">UF ${d.UF}</strong>
                    <div>
                        <i class="fas fa-edit" style="margin-right:15px" onclick="window.editDept('${d.id}')"></i>
                        <i class="fas fa-trash admin-only" onclick="window.deleteDept('${d.id}', '${d.UF}')"></i>
                    </div>
                </div>
                <div style="font-size:13px; margin-top:5px">
                    <b>P:</b> ${d.Propietario || "-"} <br>
                    <b>I:</b> ${d.Inquilino || "-"}
                </div>
            </div>
        `).join('');
        if(currentUser.role !== "admin") document.querySelectorAll(".admin-only").forEach(el => el.style.display = "none");
    };

    // --- BOTONES ---
    document.getElementById("btn-clear").onclick = () => {
        document.getElementById("search-text").value = "";
        renderList(departamentos);
        window.scrollTo({top: 0, behavior: 'smooth'});
    };

    document.getElementById("btn-search").onclick = () => {
        const t = document.getElementById("search-text").value.toLowerCase();
        renderList(departamentos.filter(d => Object.values(d).some(v => String(v).toLowerCase().includes(t))));
    };

    // --- LOGICA DE MODALES (RECUPERADOS) ---
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
        editId = null;
    };

    // --- LOGIN ---
    document.getElementById("btn-login").onclick = () => {
        const u = document.getElementById("login-user").value;
        const p = document.getElementById("login-pass").value;
        const found = users.find(x => x.username === u && x.password === p);
        if(found) { localStorage.setItem("isLogged", JSON.stringify(found)); location.reload(); }
        else alert("Credenciales incorrectas");
    };

    if(currentUser) {
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("main-screen").classList.remove("hidden");
        listenData();
    }
    
    // Recuperar Pass
    document.getElementById("btn-recover").onclick = () => document.getElementById("modal-recover").classList.remove("hidden");
    document.getElementById("btn-close-recover").onclick = () => document.getElementById("modal-recover").classList.add("hidden");
    document.getElementById("btn-verify-phone").onclick = () => {
        if(document.getElementById("recover-phone").value === masterPhone) {
            document.getElementById("recover-step-2").classList.remove("hidden");
            document.getElementById("btn-verify-phone").onclick = () => {
                users[0].password = document.getElementById("new-admin-pass").value;
                localStorage.setItem("users", JSON.stringify(users));
                alert("Admin reseteado"); location.reload();
            };
        }
    };
});