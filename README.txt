# GestiónUF - Instrucciones rápidas

## Credenciales por defecto
- Usuario: admin
  Contraseña: admin

- Usuario: demo
  Contraseña: demo

## Primer uso
1. Abra la consola del navegador (F12 → pestaña Console).
2. Ejecute:
   localStorage.clear();
3. Recargue la página.
4. Inicie sesión con admin/admin o demo/demo.

## Funciones principales
- **Agregar / Editar / Eliminar** departamentos.
- **Listar Todos** o solo los **Vacíos**.
- **Buscar** por UF o por Propietario/Inquilino.
- **Exportar CSV** con todos los datos.
- **Importar CSV** (solo administrador).
- **Registrar Usuario** (solo administrador).
- **Eliminar Base de Datos** (requiere contraseña del usuario actual).
- **Modo nocturno** con el botón ☀️ / 🌙.

## Nota
Si el inicio de sesión falla, repita `localStorage.clear()` para restablecer los usuarios por defecto.
