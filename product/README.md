# Pauta RPP, producto funcional

Aplicación de la Fase 1. Convive con el mockup estático y se despliega en
Vercel usando `product/` como directorio raíz.

Producción: https://rpp-pauta.vercel.app

## Desarrollo local sin Supabase

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`.

Con `NEXT_PUBLIC_DATA_MODE=local`, la aplicación usa un repositorio validado con
Zod. Los cambios se guardan en `localStorage` y no se comparten entre
computadoras.

## Desarrollo local con Supabase

Copia `.env.example` a `.env.local` y configura:

```bash
NEXT_PUBLIC_DATA_MODE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://ecywwvlijuvspdngbqhh.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=tu_clave_publica
```

La autenticación funciona por enlace enviado al correo. El usuario debe existir
previamente en Supabase Auth. Los permisos se obtienen de `public.profiles` y
las escrituras están protegidas por las políticas RLS versionadas en
`../supabase/migrations/`.

## Verificación

```bash
npm run check
```

## Datos alojados

Las migraciones de Supabase viven en `../supabase/migrations/` y están aplicadas
al proyecto remoto `rpp-pauta`. Las variables públicas se configuran en Vercel;
ninguna credencial privada se guarda en este repositorio.
