# Pauta RPP, producto funcional

Aplicación de la Fase 1. Convive con el mockup estático y se despliega en
Vercel usando `product/` como directorio raíz.

Producción: https://rpp-pauta.vercel.app

## Desarrollo local

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`.

Por ahora la aplicación usa un repositorio local validado con Zod. Los cambios
se guardan en `localStorage` y no se comparten entre computadoras.

## Verificación

```bash
npm run check
```

## Datos alojados

Las migraciones de Supabase viven en `../supabase/migrations/`. Todavía no hay
un proyecto remoto enlazado ni credenciales en este repositorio.
