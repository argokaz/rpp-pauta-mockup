# Pauta RPP, producto funcional

Aplicación funcional de las Fases 1 y 2. Convive con el mockup estático y se despliega en
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
OPENAI_API_KEY=tu_clave_privada
OPENAI_MODEL=gpt-5.4-mini
```

La autenticación del piloto funciona con credenciales asignadas. El usuario debe
existir previamente en Supabase Auth. Los permisos se obtienen de `public.profiles` y
las escrituras están protegidas por las políticas RLS versionadas en
`../supabase/migrations/`.

La estructuración con IA se ejecuta en `/api/structure-pauta`. La clave privada
no llega al navegador, la ruta valida la sesión y el modelo solo devuelve una
propuesta editable. El guardado de la escaleta ocurre después de la confirmación
humana.

## Verificación

```bash
npm run check
```

## Datos alojados

Las migraciones de Supabase viven en `../supabase/migrations/` y están aplicadas
al proyecto remoto `rpp-pauta`. Las variables públicas se configuran en Vercel;
ninguna credencial privada se guarda en este repositorio.
