// ... (Configuración de Firebase igual a la anterior)

document.addEventListener("DOMContentLoaded", () => {
    // 1. SOLUCIÓN AL BOTÓN LIMPIAR Y BÚSQUEDA
    const btnClear = document.getElementById("btn-clear");
    const searchText = document.getElementById("search-text");

    btnClear.onclick = () => {
        searchText.value = "";
        renderList(departamentos); // Muestra todo
        window.scrollTo({top: 0, behavior: 'smooth'});
        showToast("Vista reiniciada");
    };

    // 2. SOLUCIÓN AL IMPORTADOR (Soporta tus dos archivos)
    const processCSV = async (file) => {
        const text = await file.text();
        const separator = text.includes(";") ? ";" : ",";
        const rows = text.split("\n").slice(1);
        const batch = writeBatch(db);

        rows.forEach(row => {
            const cols = row.split(separator);
            if(cols[0]) {
                const ref = doc(collection(db, "departamentos"));
                batch.set(ref, {
                    UF: cols[0].trim().padStart(4, '0'),
                    Propietario: cols[1]?.trim() || "",
                    TelefonoPropietario: cols[2]?.trim() || "",
                    Inquilino: cols[3]?.trim() || "",
                    TelefonoInquilino: cols[4]?.trim() || ""
                });
            }
        });
        await batch.commit();
        showToast("Base de datos actualizada en la nube");
    };

    // 3. RECUPERAR BOTONES DE MODALES
    document.getElementById("btn-recover").onclick = () => {
        document.getElementById("modal-recover").classList.remove("hidden");
    };

    document.getElementById("btn-users").onclick = () => {
        // Carga la lista de usuarios locales en el modal
        const container = document.getElementById("users-admin-list");
        container.innerHTML = users.map(u => `<div>${u.username}</div>`).join('');
        document.getElementById("modal-users-list").classList.remove("hidden");
    };
});