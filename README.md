# Devoluciones de llamada — panel en vivo

App que muestra los seguimientos pendientes de LeadDesk (vía Supabase), agrupados por zona, con un botón para marcarlos como resueltos.

## Desplegar en Vercel (sin usar terminal)

1. Sube esta carpeta a un repositorio nuevo en GitHub (arrastra los archivos en github.com/new, o usa GitHub Desktop).
2. Entra en https://vercel.com → "Add New" → "Project" → conecta tu cuenta de GitHub → elige este repositorio.
3. Vercel detecta automáticamente que es un proyecto Vite — no hace falta tocar nada, dale a "Deploy".
4. En 1-2 minutos tendrás una URL propia (tipo `devoluciones-app.vercel.app`) ya funcionando.

## Desplegar en Vercel (con terminal, más rápido)

```bash
npm install -g vercel
cd devoluciones-app
npm install
vercel
```

Sigue las preguntas en pantalla (crea cuenta si no tienes, elige el nombre del proyecto) y en un minuto te da la URL.

## Desarrollo local

```bash
npm install
npm run dev
```

Abre http://localhost:5173

## Notas

- La clave de Supabase usada en `src/supabaseClient.js` es la **publishable key** (segura para exponer en el navegador). El acceso real está controlado por las políticas RLS de la tabla `devoluciones` en Supabase (solo lectura + marcar como resuelto).
- Si cambias de proyecto de Supabase, actualiza `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` en `src/supabaseClient.js`.
