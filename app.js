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

    // --- SEGURIDAD ---
    const checkPass = () => {
        const p = prompt("SEGURIDAD: Ingrese clave de administrador para confirmar acción:");
        return p === "admin"; // Cambia "admin" por tu clave real
    };

    // --- LOGIN ---
    const btnLogin = document.getElementById("btn-login");
    const login = () => {
        if(document.getElementById("login-user").value === "admin" && document.getElementById("login-pass").value === "admin") {
            localStorage.setItem("uf_auth", "true");
            location.reload();
        } else { alert("Error"); }
    };
    btnLogin.onclick = login;

    if(localStorage.getItem("uf_auth") === "true") {
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("main-screen").classList.remove("hidden");
        
        // --- CARGA FIREBASE ---
        onSnapshot(query(collection(db, "departamentos"), orderBy("UF", "asc")), (snap) => {
            departamentos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            render(departamentos);
        });

        // --- RENDERIZADO ---
        function render(data) {
            const list = document.getElementById("list");
            list.innerHTML = "";
            data.forEach(d => {
                const sinTel = !d.TelefonoPropietario && !d.TelefonoInquilino;
                const tel = d.TelefonoPropietario || d.TelefonoInquilino || "";
                
                const div = document.createElement("div");
                div.className = `item ${sinTel ? 'no-phone' : ''}`;
                div.innerHTML = `
                    <div style="display:flex; justify-content:space-between">
                        <b style="color:var(--accent); font-size:18px">UF ${d.UF}</b>
                        <div>
                            <i class="fas fa-edit" style="margin-right:15px" onclick="window.editUF('${d.id}')"></i>
                            <i class="fas fa-trash" style="color:var(--danger)" onclick="window.deleteUF('${d.id}')"></i>
                        </div>
                    </div>
                    <div style="font-size:14px; margin:8px 0">
                        <p><b>Prop:</b> ${d.Propietario || "-"}</p>
                        <p><b>Inq:</b> ${d.Inquilino || "-"}</p>
                    </div>
                    <div class="action-bar ${sinTel ? 'hidden' : ''}">
                        <a href="tel:${tel}" class="action-btn primary" style="background:#2563eb"><i class="fas fa-phone"></i></a>
                        <a href="https://wa.me/${tel.replace(/\D/g,'')}?text=Hola" target="_blank" class="action-btn success" style="background:#25d366"><i class="fab fa-whatsapp"></i></a>
                    </div>
                `;
                list.appendChild(div);
            });
        }

        // --- ACCIONES ---
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
            if(checkPass()) await deleteDoc(doc(db, "departamentos", id));
        };

        document.getElementById("btn-delete-all").onclick = async () => {
            if(confirm("¿BORRAR TODA LA BASE?") && checkPass()) {
                const snap = await getDocs(collection(db, "departamentos"));
                const batch = writeBatch(db);
                snap.forEach(d => batch.delete(d.ref));
                await batch.commit();
            }
        };

        // IMPORTAR / EXPORTAR
        document.getElementById("btn-export").onclick = () => {
            let csv = "UF;Propietario;TelP;Inquilino;TelI\n";
            departamentos.forEach(d => csv += `${d.UF};${d.Propietario};${d.TelefonoPropietario};${d.Inquilino};${d.TelefonoInquilino}\n`);
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'Base_UF.csv'; a.click();
        };

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
            alert("Importación completa");
        };

        // OTROS
        document.getElementById("btn-filter-empty").onclick = () => render(departamentos.filter(d => !d.TelefonoPropietario && !d.TelefonoInquilino));
        document.getElementById("btn-clear").onclick = () => render(departamentos);
        document.getElementById("btn-search").onclick = () => {
            const val = document.getElementById("search-input").value.toLowerCase();
            render(departamentos.filter(d => d.UF.includes(val) || d.Propietario.toLowerCase().includes(val)));
        };
        document.getElementById("btn-logout").onclick = () => { localStorage.removeItem("uf_auth"); location.reload(); };
        document.getElementById("btn-theme").onclick = () => document.body.classList.toggle("dark-mode");
        document.getElementById("btn-log-toggle").onclick = () => document.getElementById("log-panel").classList.toggle("hidden");
        document.getElementById("btn-cancel").onclick = () => document.getElementById("modal-form").classList.add("hidden");
        
        const rocket = document.getElementById("btn-rocket");
        window.onscroll = () => rocket.classList.toggle("hidden", window.scrollY < 300);
        rocket.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});