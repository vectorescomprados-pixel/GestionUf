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

    // --- MANEJO DE SCROLL (BOTÓN COHETE) ---
    const rocket = document.getElementById("btn-rocket");
    window.onscroll = () => {
        rocket.style.display = (window.scrollY > 300) ? "block" : "none";
    };
    rocket.onclick = () => window.scrollTo({top: 0, behavior: 'smooth'});

    // --- IMPORTACIÓN INTELIGENTE (Detecta ; o ,) ---
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
                        UF: c[0].trim().padStart(4, '0'), // Normaliza a 0001
                        Propietario: c[1]?.trim() || "", 
                        TelefonoPropietario: c[2]?.trim() || "", 
                        Inquilino: c[3]?.trim() || "", 
                        TelefonoInquilino: c[4]?.trim() || "" 
                    });
                    count++;
                }
            });
            await batch.commit();
            showToast(`Sincronizadas ${count} UFs`);
        };
        reader.readAsText(e.target.files[0]);
    };

    // --- RENDERIZADO Y BOTONES ---
    const listenData = () => {
        const q = query(collection(db, "departamentos"), orderBy("UF", "asc"));
        onSnapshot(q, (snapshot) => {
            departamentos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderList(departamentos);
        });
    };

    const renderList = (items) => {
        const listDiv = document.getElementById("list");
        listDiv.innerHTML = items.map(d => `
            <div class="item" style="${(!d.TelefonoPropietario && !d.TelefonoInquilino) ? 'border-color:var(--warning)' : ''}">
                <div class="item-header"><strong>UF: ${d.UF}</strong>
                    <div><button class="btn primary" onclick="window.editDept('${d.id}')">Editar</button>
                    <button class="btn danger admin-only" onclick="window.deleteDept('${d.id}', '${d.UF}')">Borrar</button></div>
                </div>
                <p>Prop: ${d.Propietario || "-"}</p><p>Inq: ${d.Inquilino || "-"}</p>
            </div>`).join('');
        if(currentUser?.role !== "admin") document.querySelectorAll(".admin-only").forEach(el => el.style.display = "none");
    };

    // BOTÓN LIMPIAR: Resetea búsqueda y vuelve arriba para ver el Log
    document.getElementById("btn-clear").onclick = () => {
        document.getElementById("search-text").value = "";
        renderList(departamentos);
        window.scrollTo({top: 0, behavior: 'smooth'});
    };

    // BOTÓN CUENTAS Y RECUPERAR (Re-enlazados)
    document.getElementById("btn-users").onclick = () => {
        const list = document.getElementById("users-admin-list");
        list.innerHTML = users.map((u,i) => `<div>${u.username} (${u.role}) <button onclick="window.delUser(${i})">X</button></div>`).join('');
        document.getElementById("modal-users-list").classList.remove("hidden");
    };

    document.getElementById("btn-recover").onclick = () => document.getElementById("modal-recover").classList.remove("hidden");

    // Mantener el resto de funciones (editDept, deleteDept, btn-save, btn-login)...
    // (Asegúrate de incluir las funciones que ya teníamos de login y guardado)

    if(currentUser) {
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("main-screen").classList.remove("hidden");
        document.getElementById("current-user-display").innerText = currentUser.username;
        listenData();
        renderLogs(); // Función renderLogs que definimos antes
    }
});