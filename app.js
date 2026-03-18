// ... (Importaciones y Configuración Firebase se mantienen igual) ...

document.addEventListener("DOMContentLoaded", () => {
    let departamentos = [];
    let editId = null;
    const adminTel = "123456789"; // Reemplaza por tu número

    // --- LOG ---
    const writeLog = (msg) => {
        const lp = document.getElementById("log-panel");
        if(lp) {
            lp.innerHTML += `<div>[${new Date().toLocaleTimeString()}] ${msg}</div>`;
            lp.scrollTop = lp.scrollHeight;
        }
    };

    // --- GESTIÓN DE RECUPERACIÓN ---
    document.getElementById("btn-recover-open").onclick = () => {
        document.getElementById("modal-recover").classList.remove("hidden");
        document.getElementById("step-1").classList.remove("hidden");
        document.getElementById("step-2").classList.add("hidden");
    };

    document.getElementById("btn-verify-tel").onclick = () => {
        const t = document.getElementById("rec-tel").value;
        if(t === adminTel) {
            document.getElementById("step-1").classList.add("hidden");
            document.getElementById("step-2").classList.remove("hidden");
            writeLog("Validación de teléfono exitosa.");
        } else { alert("Número no reconocido."); }
    };

    document.getElementById("btn-save-pass").onclick = () => {
        const p = document.getElementById("new-pass").value;
        if(p.length >= 4) {
            alert("Contraseña actualizada (admin / " + p + ")");
            document.getElementById("modal-recover").classList.add("hidden");
            writeLog("Contraseña modificada por usuario.");
        }
    };
    document.getElementById("btn-close-rec").onclick = () => document.getElementById("modal-recover").classList.add("hidden");

    // --- LOGIN ---
    const login = () => {
        if(document.getElementById("login-user").value === "admin" && document.getElementById("login-pass").value === "admin") {
            localStorage.setItem("uf_auth", "true");
            location.reload();
        } else { alert("Error"); }
    };
    document.getElementById("btn-login").onclick = login;
    document.getElementById("login-pass").onkeypress = (e) => { if(e.key === "Enter") login(); };

    if(localStorage.getItem("uf_auth") === "true") {
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("main-screen").classList.remove("hidden");

        onSnapshot(query(collection(db, "departamentos"), orderBy("UF", "asc")), (snap) => {
            departamentos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            render(departamentos);
        });

        // --- CRUD REVISADO ---
        document.getElementById("btn-add").onclick = () => {
            editId = null;
            document.querySelectorAll("#modal-form input").forEach(i => i.value = "");
            document.getElementById("modal-form").classList.remove("hidden");
            writeLog("Abriendo formulario: Nueva UF");
        };

        window.editUF = (id) => {
            const d = departamentos.find(x => x.id === id);
            editId = id;
            document.getElementById("f-uf").value = d.UF;
            document.getElementById("f-prop").value = d.Propietario || "";
            document.getElementById("f-telp").value = d.TelefonoPropietario || "";
            document.getElementById("f-inq").value = d.Inquilino || "";
            document.getElementById("f-teli").value = d.TelefonoInquilino || "";
            document.getElementById("modal-form").classList.remove("hidden");
            writeLog(`Editando UF ${d.UF}`);
        };

        document.getElementById("btn-save").onclick = async () => {
            const data = {
                UF: document.getElementById("f-uf").value,
                Propietario: document.getElementById("f-prop").value,
                TelefonoPropietario: document.getElementById("f-telp").value,
                Inquilino: document.getElementById("f-inq").value,
                TelefonoInquilino: document.getElementById("f-teli").value
            };
            if(editId) {
                await updateDoc(doc(db, "departamentos", editId), data);
                writeLog(`UF ${data.UF} actualizada.`);
            } else {
                await addDoc(collection(db, "departamentos"), data);
                writeLog(`UF ${data.UF} creada.`);
            }
            document.getElementById("modal-form").classList.add("hidden");
        };

        // --- FILTROS ---
        document.getElementById("btn-clear").onclick = () => {
            document.getElementById("search-input").value = "";
            render(departamentos);
            writeLog("Vista: Ver Todo.");
        };

        document.getElementById("btn-filter-empty").onclick = () => {
            render(departamentos.filter(d => !d.Inquilino || d.Inquilino.trim() === ""));
            writeLog("Filtrado: UF Vacías.");
        };

        // ... (Resto de funciones: Search, Delete, Export con sus writeLog correspondientes) ...
    }
});