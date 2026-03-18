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

    // --- LOGIN ---
    const login = () => {
        const u = document.getElementById("login-user").value;
        const p = document.getElementById("login-pass").value;
        if(u === "admin" && p === "admin") {
            localStorage.setItem("session_uf", "active");
            location.reload();
        } else { alert("Error de acceso"); }
    };

    document.getElementById("btn-login").onclick = login;
    document.getElementById("login-pass").onkeypress = (e) => { if(e.key === "Enter") login(); };
    document.getElementById("btn-recover").onclick = () => alert("Pista: admin / admin");

    if(localStorage.getItem("session_uf") === "active") {
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("main-screen").classList.remove("hidden");
        iniciarApp();
    }

    function iniciarApp() {
        // Escucha de Firebase
        onSnapshot(query(collection(db, "departamentos"), orderBy("UF", "asc")), (snap) => {
            departamentos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            render(departamentos);
        });

        // RENDER PRINCIPAL
        function render(data) {
            const listDiv = document.getElementById("list");
            listDiv.innerHTML = ""; // Limpieza de duplicados
            data.forEach(d => {
                const tieneTel = (d.TelefonoPropietario && d.TelefonoPropietario.trim() !== "") || 
                                (d.TelefonoInquilino && d.TelefonoInquilino.trim() !== "");
                
                const telLink = d.TelefonoPropietario || d.TelefonoInquilino || "";
                const wpNum = telLink.replace(/\D/g,'');

                const div = document.createElement("div");
                div.className = `item ${!tieneTel ? 'no-phone' : ''}`;
                div.innerHTML = `
                    <div style="display:flex; justify-content:space-between">
                        <b style="color:var(--primary)">UF ${d.UF}</b>
                        <div>
                            <i class="fas fa-edit" style="margin-right:15px; cursor:pointer" onclick="window.editUF('${d.id}')"></i>
                            <i class="fas fa-trash" style="color:var(--danger); cursor:pointer" onclick="window.deleteUF('${d.id}')"></i>
                        </div>
                    </div>
                    <div style="margin:10px 0; font-size:14px">
                        <div>Prop: ${d.Propietario || "-"}</div>
                        <div>Inq: ${d.Inquilino || "-"}</div>
                    </div>
                    <div class="action-bar ${!tieneTel ? 'hidden' : ''}">
                        <a href="tel:${telLink}" class="action-btn primary"><i class="fas fa-phone"></i></a>
                        <a href="https://wa.me/${wpNum}?text=Hola" target="_blank" class="action-btn success" style="background:#25d366"><i class="fab fa-whatsapp"></i></a>
                    </div>
                `;
                listDiv.appendChild(div);
            });
        }

        // EVENTOS DE BOTONES
        document.getElementById("btn-add").onclick = () => {
            editId = null;
            document.querySelectorAll("#modal-form input").forEach(i => i.value = "");
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
        };

        document.getElementById("btn-search").onclick = () => {
            const t = document.getElementById("search-input").value.toLowerCase();
            render(departamentos.filter(d => Object.values(d).some(v => String(v).toLowerCase().includes(t))));
        };

        document.getElementById("btn-clear").onclick = () => {
            document.getElementById("search-input").value = "";
            render(departamentos);
        };

        document.getElementById("btn-filter-empty").onclick = () => {
            render(departamentos.filter(d => !d.TelefonoPropietario && !d.TelefonoInquilino));
        };

        document.getElementById("btn-delete-all").onclick = async () => {
            if(confirm("¿BORRAR TODO?") && prompt("Clave:") === "admin") {
                const snap = await getDocs(collection(db, "departamentos"));
                const batch = writeBatch(db);
                snap.forEach(d => batch.delete(d.ref));
                await batch.commit();
            }
        };

        document.getElementById("btn-logout").onclick = () => { localStorage.removeItem("session_uf"); location.reload(); };
        document.getElementById("btn-theme").onclick = () => document.body.classList.toggle("dark-mode");
        document.getElementById("btn-toggle-log").onclick = () => document.getElementById("log-panel").classList.toggle("hidden");
        document.getElementById("btn-cancel").onclick = () => document.getElementById("modal-form").classList.add("hidden");

        // COHETE
        const rocket = document.getElementById("btn-rocket");
        window.onscroll = () => rocket.style.display = window.scrollY > 300 ? "block" : "none";
        rocket.onclick = () => window.scrollTo({top:0, behavior:'smooth'});

        // FUNCIONES GLOBALES
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

        window.deleteUF = async (id) => {
            if(confirm("¿Eliminar?")) await deleteDoc(doc(db, "departamentos", id));
        };
    }
});