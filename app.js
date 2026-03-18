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

    const login = () => {
        if(document.getElementById("login-user").value === "admin" && document.getElementById("login-pass").value === "admin") {
            localStorage.setItem("uf_auth", "true");
            location.reload();
        }
    };
    document.getElementById("btn-login").onclick = login;

    if(localStorage.getItem("uf_auth") === "true") {
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("main-screen").classList.remove("hidden");

        onSnapshot(query(collection(db, "departamentos"), orderBy("UF", "asc")), (snap) => {
            departamentos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            render(departamentos);
        });

        function render(data) {
            const list = document.getElementById("list");
            list.innerHTML = "";
            data.forEach(d => {
                const sinTel = !d.TelefonoPropietario && !d.TelefonoInquilino;
                const tel = d.TelefonoPropietario || d.TelefonoInquilino || "";
                
                const div = document.createElement("div");
                div.className = `item ${sinTel ? 'no-phone' : ''}`;
                div.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center">
                        <b style="color:var(--primary); font-size:18px">UF ${d.UF}</b>
                        <div>
                            <i class="fas fa-edit" style="margin-right:15px; cursor:pointer" onclick="window.editUF('${d.id}')"></i>
                            <i class="fas fa-trash" style="color:var(--danger); cursor:pointer" onclick="window.deleteUF('${d.id}')"></i>
                        </div>
                    </div>
                    <div style="font-size:13px; margin:10px 0">
                        <p style="margin:4px 0"><b>P:</b> ${d.Propietario || "-"}</p>
                        <p style="margin:4px 0"><b>I:</b> ${d.Inquilino || "-"}</p>
                    </div>
                    ${sinTel ? `<div style="color:var(--warning); font-weight:bold; font-size:11px"><i class="fas fa-exclamation-triangle"></i> CARGAR CONTACTO</div>` : ''}
                    <div class="action-bar ${sinTel ? 'hidden' : ''}">
                        <a href="tel:${tel}" class="action-btn bg-tel"><i class="fas fa-phone"></i></a>
                        <a href="https://wa.me/${tel.replace(/\D/g,'')}" target="_blank" class="action-btn bg-wp"><i class="fab fa-whatsapp"></i></a>
                    </div>
                `;
                list.appendChild(div);
            });
        }

        // --- VALIDACIONES DE BASE VACÍA ---
        document.getElementById("btn-export").onclick = () => {
            if(departamentos.length === 0) return alert("No hay datos para exportar");
            let csv = "UF;Propietario;TelP;Inquilino;TelI\n";
            departamentos.forEach(d => csv += `${d.UF};${d.Propietario};${d.TelefonoPropietario};${d.Inquilino};${d.TelefonoInquilino}\n`);
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'}));
            a.download = 'Base_UF.csv'; a.click();
        };

        document.getElementById("btn-delete-all").onclick = async () => {
            if(departamentos.length === 0) return alert("La base ya está vacía");
            if(confirm("¿BORRAR TODO?") && prompt("Clave:") === "admin") {
                const snap = await getDocs(collection(db, "departamentos"));
                const batch = writeBatch(db);
                snap.forEach(d => batch.delete(d.ref));
                await batch.commit();
            }
        };

        // --- FILTROS ---
        document.getElementById("btn-clear").onclick = () => {
            document.getElementById("search-input").value = "";
            render(departamentos);
        };

        document.getElementById("btn-filter-empty").onclick = () => {
            // "Vacíos" = UF donde el campo Inquilino esté vacío o no exista
            render(departamentos.filter(d => !d.Inquilino || d.Inquilino.trim() === ""));
        };

        document.getElementById("btn-search").onclick = () => {
            const val = document.getElementById("search-input").value.toLowerCase();
            render(departamentos.filter(d => d.UF.includes(val) || d.Propietario.toLowerCase().includes(val)));
        };

        // --- IMPORTAR ---
        document.getElementById("btn-import").onclick = () => document.getElementById("csv-file").click();
        document.getElementById("csv-file").onchange = async (e) => {
            const text = await e.target.files[0].text();
            const lines = text.split("\n").slice(1);
            const batch = writeBatch(db);
            lines.forEach(l => {
                const c = l.split(";");
                if(c[0]) batch.set(doc(collection(db, "departamentos")), { UF:c[0], Propietario:c[1]||"", TelefonoPropietario:c[2]||"", Inquilino:c[3]||"", TelefonoInquilino:c[4]||"" });
            });
            await batch.commit();
            alert("Base cargada.");
        };

        // --- OTROS ---
        document.getElementById("btn-add").onclick = () => { editId = null; document.querySelectorAll("#modal-form input").forEach(i => i.value = ""); document.getElementById("modal-form").classList.remove("hidden"); };
        document.getElementById("btn-save").onclick = async () => {
            const data = { UF: document.getElementById("f-uf").value, Propietario: document.getElementById("f-prop").value, TelefonoPropietario: document.getElementById("f-telp").value, Inquilino: document.getElementById("f-inq").value, TelefonoInquilino: document.getElementById("f-teli").value };
            if(editId) await updateDoc(doc(db, "departamentos", editId), data);
            else await addDoc(collection(db, "departamentos"), data);
            document.getElementById("modal-form").classList.add("hidden");
        };
        window.editUF = (id) => {
            const d = departamentos.find(x => x.id === id); editId = id;
            document.getElementById("f-uf").value = d.UF; document.getElementById("f-prop").value = d.Propietario; document.getElementById("f-telp").value = d.TelefonoPropietario; document.getElementById("f-inq").value = d.Inquilino; document.getElementById("f-teli").value = d.TelefonoInquilino;
            document.getElementById("modal-form").classList.remove("hidden");
        };
        window.deleteUF = async (id) => { if(confirm("¿Borrar?") && prompt("Clave:") === "admin") await deleteDoc(doc(db, "departamentos", id)); };
        document.getElementById("btn-logout").onclick = () => { localStorage.removeItem("uf_auth"); location.reload(); };
        document.getElementById("btn-theme").onclick = () => document.body.classList.toggle("dark-mode");
        document.getElementById("btn-log-toggle").onclick = () => document.getElementById("log-panel").classList.toggle("hidden");
        document.getElementById("btn-cancel").onclick = () => document.getElementById("modal-form").classList.add("hidden");
    }
});