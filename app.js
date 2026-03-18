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

    const pedirClave = () => prompt("Seguridad: Ingrese su contraseña") === currentUser.password;

    const addCloudLog = async (msg) => {
        if (!currentUser) return;
        await addDoc(collection(db, "app_logs"), {
            time: new Date().toLocaleTimeString(),
            user: currentUser.username, action: msg, timestamp: serverTimestamp()
        });
    };

    // RENDERIZADO LIMPIO (SIN DUPLICADOS)
    const renderList = (items) => {
        const listDiv = document.getElementById("list");
        listDiv.innerHTML = ""; 
        items.forEach(d => {
            const sinTel = (!d.TelefonoPropietario && !d.TelefonoInquilino);
            const div = document.createElement("div");
            div.className = `item ${sinTel ? 'empty' : ''}`;
            
            const wp = d.TelefonoPropietario ? d.TelefonoPropietario.replace(/\D/g,'') : (d.TelefonoInquilino ? d.TelefonoInquilino.replace(/\D/g,'') : null);
            const tel = d.TelefonoPropietario || d.TelefonoInquilino;

            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center">
                    <b style="font-size:20px; color:var(--primary)">UF ${d.UF}</b>
                    <div style="display:flex; gap:15px">
                        <i class="fas fa-edit" style="font-size:20px" onclick="window.editUF('${d.id}')"></i>
                        <i class="fas fa-trash-alt admin-only" style="font-size:20px; color:var(--danger)" onclick="window.deleteUF('${d.id}', '${d.UF}')"></i>
                    </div>
                </div>
                <div style="margin: 10px 0; font-size:15px">
                    <div><b>P:</b> ${d.Propietario || "-"}</div>
                    <div><b>I:</b> ${d.Inquilino || "-"}</div>
                </div>
                ${sinTel ? '<div style="color:var(--warning); font-weight:bold; font-size:12px">⚠️ CARGAR CONTACTO</div>' : ''}
                <div class="action-bar">
                    <a href="tel:${tel}" class="btn-action primary"><i class="fas fa-phone"></i></a>
                    <a href="https://wa.me/${wp}" class="btn-action success" style="background:var(--whatsapp)"><i class="fab fa-whatsapp"></i></a>
                </div>
            `;
            listDiv.appendChild(div);
        });
        if(currentUser?.role !== "admin") document.querySelectorAll(".admin-only").forEach(el => el.style.display = "none");
    };

    // ACCIONES
    window.deleteUF = async (id, uf) => {
        if(pedirClave()) {
            await deleteDoc(doc(db, "departamentos", id));
            addCloudLog(`Eliminó registro UF ${uf}`);
        }
    };

    document.getElementById("btn-delete-all").onclick = async () => {
        if(confirm("¿BORRAR TODA LA BASE DE DATOS?") && pedirClave()) {
            const snap = await getDocs(collection(db, "departamentos"));
            const batch = writeBatch(db);
            snap.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            addCloudLog("BORRADO TOTAL DE BASE DE DATOS");
        }
    };

    document.getElementById("btn-export").onclick = () => {
        let csv = "UF;Propietario;TelP;Inquilino;TelI\n";
        departamentos.forEach(d => csv += `${d.UF};${d.Propietario};${d.TelefonoPropietario};${d.Inquilino};${d.TelefonoInquilino}\n`);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'}));
        a.download = "Base_UF.csv"; a.click();
    };

    // LOGIN CON ENTER
    const login = () => {
        const u = document.getElementById("login-user").value, p = document.getElementById("login-pass").value;
        const found = users.find(x => x.username === u && x.password === p);
        if(found) { localStorage.setItem("isLogged", JSON.stringify(found)); location.reload(); }
        else alert("Credenciales inválidas");
    };
    document.getElementById("btn-login").onclick = login;
    document.getElementById("login-pass").onkeypress = (e) => { if(e.key === "Enter") login(); };

    // CARGA FIREBASE
    const load = () => {
        onSnapshot(query(collection(db, "departamentos"), orderBy("UF", "asc")), (snap) => {
            departamentos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            renderList(departamentos);
        });
        onSnapshot(query(collection(db, "app_logs"), orderBy("timestamp", "desc"), limit(15)), (snap) => {
            document.getElementById("log-list").innerHTML = snap.docs.map(d => `<div>[${d.data().time}] ${d.data().user}: ${d.data().action}</div>`).join('');
        });
    };

    if(currentUser) {
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("main-screen").classList.remove("hidden");
        load();
    }

    // EVENTOS BOTONES
    document.getElementById("btn-search").onclick = () => {
        const t = document.getElementById("search-text").value.toLowerCase();
        renderList(departamentos.filter(d => Object.values(d).some(v => String(v).toLowerCase().includes(t))));
    };
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
        addCloudLog(`Guardó/Editó UF ${data.UF}`);
    };
    
    document.getElementById("btn-users").onclick = () => {
        document.getElementById("users-admin-list").innerHTML = users.map(u => `<div><b>${u.username}</b> (${u.role})</div>`).join('');
        document.getElementById("modal-users").classList.remove("hidden");
    };
    document.getElementById("btn-save-user").onclick = () => {
        const u = document.getElementById("u-name").value, p = document.getElementById("u-pass").value, r = document.getElementById("u-role").value;
        if(u && p) {
            users.push({username:u, password:p, role:r});
            localStorage.setItem("users", JSON.stringify(users));
            addCloudLog(`Creó usuario ${u}`);
            document.getElementById("modal-users").classList.add("hidden");
        }
    };
    document.getElementById("btn-close-users").onclick = () => document.getElementById("modal-users").classList.add("hidden");
    document.getElementById("btn-logout").onclick = () => { localStorage.removeItem("isLogged"); location.reload(); };
    window.editUF = (id) => {
        const d = departamentos.find(x => x.id === id);
        editId = id;
        document.getElementById("f-uf").value = d.UF; document.getElementById("f-prop").value = d.Propietario;
        document.getElementById("f-telp").value = d.TelefonoPropietario; document.getElementById("f-inq").value = d.Inquilino;
        document.getElementById("f-teli").value = d.TelefonoInquilino;
        document.getElementById("modal-form").classList.remove("hidden");
    };
});