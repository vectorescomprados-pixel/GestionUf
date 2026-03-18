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
    let users = JSON.parse(localStorage.getItem("users")) || [{username:"admin", password:"admin", role:"admin"}];

    const pedirClave = () => prompt("Seguridad: Ingrese su clave de usuario") === currentUser.password;

    const renderList = (items) => {
        const listDiv = document.getElementById("list");
        listDiv.innerHTML = ""; // ELIMINA DUPLICADOS
        items.forEach(d => {
            const sinTel = (!d.TelefonoPropietario && !d.TelefonoInquilino);
            const div = document.createElement("div");
            div.className = `item ${sinTel ? 'empty' : ''}`;
            const tel = d.TelefonoPropietario || d.TelefonoInquilino || "";
            const wp = tel.replace(/\D/g,'');

            div.innerHTML = `
                <div style="display:flex; justify-content:space-between">
                    <b style="color:var(--primary)">UF ${d.UF}</b>
                    <div style="display:flex; gap:12px">
                        <i class="fas fa-edit" onclick="window.editUF('${d.id}')"></i>
                        <i class="fas fa-trash admin-only" style="color:var(--danger)" onclick="window.deleteUF('${d.id}', '${d.UF}')"></i>
                    </div>
                </div>
                <div style="font-size:14px; margin:8px 0">
                    <p style="margin:2px 0">Prop: ${d.Propietario || "-"}</p>
                    <p style="margin:2px 0">Inq: ${d.Inquilino || "-"}</p>
                </div>
                ${sinTel ? '<span style="font-size:10px; color:#f59e0b; font-weight:bold">⚠️ CARGAR CONTACTO</span>' : ''}
                <div class="action-bar">
                    <a href="tel:${tel}" class="action-btn primary"><i class="fas fa-phone"></i></a>
                    <a href="https://wa.me/${wp}?text=Hola" target="_blank" class="action-btn success"><i class="fab fa-whatsapp"></i></a>
                </div>
            `;
            listDiv.appendChild(div);
        });
        if(currentUser?.role !== "admin") document.querySelectorAll(".admin-only").forEach(el => el.style.display = "none");
    };

    // BOTONES QUE NO FUNCIONABAN:
    document.getElementById("btn-clear").onclick = () => {
        document.getElementById("search-text").value = "";
        renderList(departamentos);
    };

    document.getElementById("btn-list-empty").onclick = () => {
        renderList(departamentos.filter(d => !d.TelefonoPropietario && !d.TelefonoInquilino));
    };

    document.getElementById("btn-export").onclick = () => {
        let csv = "UF;Propietario;TelP;Inquilino;TelI\n";
        departamentos.forEach(d => csv += `${d.UF};${d.Propietario};${d.TelefonoPropietario};${d.Inquilino};${d.TelefonoInquilino}\n`);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'}));
        a.download = "Base_Datos.csv"; a.click();
    };

    document.getElementById("btn-import").onclick = () => document.getElementById("csv-file").click();
    document.getElementById("csv-file").onchange = async (e) => {
        const text = await e.target.files[0].text();
        const rows = text.split("\n").slice(1);
        const batch = writeBatch(db);
        rows.forEach(row => {
            const c = row.split(";");
            if(c[0]) batch.set(doc(collection(db, "departamentos")), {UF:c[0], Propietario:c[1]||"", TelefonoPropietario:c[2]||"", Inquilino:c[3]||"", TelefonoInquilino:c[4]||""});
        });
        await batch.commit();
    };

    // MODOS Y LOGS
    document.getElementById("btn-dark-mode").onclick = () => document.body.classList.toggle("dark-mode");
    document.getElementById("btn-show-log").onclick = () => document.getElementById("log-modal").classList.remove("hidden");
    document.getElementById("btn-close-log").onclick = () => document.getElementById("log-modal").classList.add("hidden");

    // LOGIN
    const login = () => {
        const u = document.getElementById("login-user").value, p = document.getElementById("login-pass").value;
        const found = users.find(x => x.username === u && x.password === p);
        if(found) { localStorage.setItem("isLogged", JSON.stringify(found)); location.reload(); }
    };
    document.getElementById("btn-login").onclick = login;
    document.getElementById("login-pass").onkeypress = (e) => { if(e.key === "Enter") login(); };

    // INICIO DE DATOS
    if(currentUser) {
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("main-screen").classList.remove("hidden");
        onSnapshot(query(collection(db, "departamentos"), orderBy("UF", "asc")), (snap) => {
            departamentos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            renderList(departamentos);
        });
    }

    // BOTONES DE CIERRE CORREGIDOS
    document.getElementById("btn-users").onclick = () => document.getElementById("modal-users").classList.remove("hidden");
    document.getElementById("btn-close-users").onclick = () => document.getElementById("modal-users").classList.add("hidden");
    document.getElementById("btn-open-recover").onclick = () => document.getElementById("modal-recover").classList.remove("hidden");
    document.getElementById("btn-close-recover").onclick = () => document.getElementById("modal-recover").classList.add("hidden");
    document.getElementById("btn-cancel").onclick = () => document.getElementById("modal-form").classList.add("hidden");
    document.getElementById("btn-logout").onclick = () => { localStorage.removeItem("isLogged"); location.reload(); };
    
    window.editUF = (id) => {
        const d = departamentos.find(x => x.id === id);
        editId = id;
        document.getElementById("f-uf").value = d.UF;
        document.getElementById("modal-form").classList.remove("hidden");
    };

    window.deleteUF = async (id, uf) => {
        if(pedirClave()) await deleteDoc(doc(db, "departamentos", id));
    };
});