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
    let pendingAction = null;

    // --- LOG DE ACTIVIDAD ---
    const writeLog = (msg) => {
        const logPanel = document.getElementById("log-panel");
        const time = new Date().toLocaleTimeString();
        logPanel.innerHTML += `<div>[${time}] ${msg}</div>`;
        logPanel.scrollTop = logPanel.scrollHeight;
    };

    // --- LOGIN CON ENTER ---
    const doLogin = () => {
        if(document.getElementById("login-user").value === "admin" && document.getElementById("login-pass").value === "admin") {
            localStorage.setItem("uf_auth", "true");
            location.reload();
        } else { alert("Usuario o clave incorrecta"); }
    };
    document.getElementById("btn-login").onclick = doLogin;
    document.getElementById("login-pass").onkeypress = (e) => { if(e.key === "Enter") doLogin(); };
    document.getElementById("btn-recover").onclick = () => alert("La clave por defecto es: admin / admin");

    if(localStorage.getItem("uf_auth") === "true") {
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("main-screen").classList.remove("hidden");
        writeLog("Sistema iniciado. Conexión establecida.");

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
                            <i class="fas fa-trash" style="color:var(--danger); cursor:pointer" onclick="window.askConfirm('Borrar UF ${d.UF}', 'delete', '${d.id}')"></i>
                        </div>
                    </div>
                    <div style="font-size:13px; margin:10px 0">
                        <p style="margin:4px 0"><b>P:</b> ${d.Propietario || "-"}</p>
                        <p style="margin:4px 0"><b>I:</b> ${d.Inquilino || "-"}</p>
                    </div>
                    ${sinTel ? `<div style="color:var(--warning); font-weight:bold; font-size:11px"><i class="fas fa-exclamation-triangle"></i> CARGAR CONTACTO</div>` : ''}
                    <div class="action-bar ${sinTel ? 'hidden' : ''}">
                        <a href="tel:${tel}" class="action-btn" style="background:var(--primary)"><i class="fas fa-phone"></i></a>
                        <a href="https://wa.me/${tel.replace(/\D/g,'')}" target="_blank" class="action-btn" style="background:#25d366"><i class="fab fa-whatsapp"></i></a>
                    </div>
                `;
                list.appendChild(div);
            });
        }

        // --- SISTEMA DE CONFIRMACIÓN CON CLAVE OCULTA ---
        window.askConfirm = (msg, type, id = null) => {
            pendingAction = { type, id };
            document.getElementById("confirm-msg").innerText = msg;
            document.getElementById("confirm-pass").value = "";
            document.getElementById("modal-confirm").classList.remove("hidden");
        };

        document.getElementById("btn-confirm-yes").onclick = async () => {
            if(document.getElementById("confirm-pass").value !== "admin") return alert("Clave incorrecta");
            
            if(pendingAction.type === 'delete') {
                await deleteDoc(doc(db, "departamentos", pendingAction.id));
                writeLog("Registro eliminado.");
            } else if(pendingAction.type === 'export') {
                runExport();
            } else if(pendingAction.type === 'deleteAll') {
                const snap = await getDocs(collection(db, "departamentos"));
                const batch = writeBatch(db);
                snap.forEach(d => batch.delete(d.ref));
                await batch.commit();
                writeLog("Base de datos vaciada.");
            }
            document.getElementById("modal-confirm").classList.add("hidden");
        };

        document.getElementById("btn-confirm-no").onclick = () => document.getElementById("modal-confirm").classList.add("hidden");

        // --- EXPORTAR / IMPORTAR ---
        document.getElementById("btn-export").onclick = () => askConfirm("Se descargará una copia de seguridad en formato CSV", "export");
        const runExport = () => {
            let csv = "UF;Propietario;TelP;Inquilino;TelI\n";
            departamentos.forEach(d => csv += `${d.UF};${d.Propietario};${d.TelefonoPropietario};${d.Inquilino};${d.TelefonoInquilino}\n`);
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'}));
            a.download = 'Base_UF.csv'; a.click();
            writeLog("Base exportada.");
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
            writeLog("Base de datos importada correctamente.");
        };

        // --- BOTONES EXTRAS ---
        document.getElementById("btn-delete-all").onclick = () => askConfirm("¡ESTA ACCIÓN BORRARÁ TODOS LOS REGISTROS!", "deleteAll");
        document.getElementById("btn-clear").onclick = () => { document.getElementById("search-input").value = ""; render(departamentos); };
        document.getElementById("btn-filter-empty").onclick = () => render(departamentos.filter(d => !d.Inquilino || d.Inquilino.trim() === ""));
        document.getElementById("btn-search").onclick = () => {
            const val = document.getElementById("search-input").value.toLowerCase();
            render(departamentos.filter(d => d.UF.includes(val) || d.Propietario.toLowerCase().includes(val)));
        };

        // --- COHETE ---
        const rocket = document.getElementById("btn-rocket");
        window.onscroll = () => rocket.classList.toggle("hidden", window.scrollY < 300);
        rocket.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });

        document.getElementById("btn-theme").onclick = () => document.body.classList.toggle("dark-mode");
        document.getElementById("btn-log-toggle").onclick = () => document.getElementById("log-panel").classList.toggle("hidden");
        document.getElementById("btn-logout").onclick = () => { localStorage.removeItem("uf_auth"); location.reload(); };
    }
});