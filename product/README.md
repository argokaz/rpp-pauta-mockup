# Pauta RPP, producto funcional

Aplicación funcional de las Fases 1 a 4. Convive con el mockup estático y se despliega en Vercel usando `product/` como directorio raíz.

La Fase 3 incorpora la operación diaria: Mesa editorial con drag and drop,
cambio accesible de estados y una base responsive para escritorio, tablet y teléfono.

La Fase 4 protege la edición compartida: guardado atómico por bloque, detección
de conflictos, historial recuperable y registro de post-pauta por noticia.

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
OPENAI_MODEL=gpt-5.6-luna
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
