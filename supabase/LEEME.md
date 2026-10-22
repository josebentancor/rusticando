# Conectar el panel de Rusticando

El panel está en `/admin/`. En la web se entra tocando el **©** del pie de página.
Hasta que hagas estos pasos, la web muestra el catálogo fijo y el panel avisa que falta la conexión.

## 1. Crear el proyecto (5 minutos)

1. Entrá a https://supabase.com y creá una cuenta (idealmente con el correo del cliente, así el proyecto queda a su nombre).
2. **New project** → nombre `rusticando`, región **São Paulo** (la más cercana a Uruguay), una contraseña de base de datos fuerte (guardala, no va en la web).
3. Cuando termine de crearse: **SQL Editor → New query**, pegá todo `supabase/setup.sql` y tocá **Run**.

## 2. Cerrar la puerta a desconocidos

1. **Authentication → Sign In / Providers → Email**: dejá Email activado.
2. **Authentication → Settings**: desactivá **Allow new users to sign up**. Así nadie puede crearse una cuenta desde afuera.

## 3. Crear el usuario del cliente

1. **Authentication → Users → Add user → Create new user**: correo del cliente y una contraseña larga (12+ caracteres). Marcá **Auto Confirm User**.
2. En **SQL Editor**, corré esta línea con ese correo:

   ```sql
   insert into public.admins (user_id) select id from auth.users where email = 'correo-del-cliente@ejemplo.com';
   ```

## 4. Conectar la web

1. **Project Settings → API**: copiá **Project URL** y la clave **anon public**.
2. Pegalas en `js/config.js`:

   ```js
   window.RUSTICANDO_CONFIG = {
     supabaseUrl: 'https://xxxxxxxx.supabase.co',
     supabaseAnonKey: 'eyJ...'
   };
   ```

3. Subí el cambio a GitHub. En un par de minutos la web lee el catálogo desde Supabase.

La clave **anon** es pública a propósito: está pensada para ir en la web. Lo que protege los datos son las reglas de `setup.sql`: cualquiera puede **ver** las piezas visibles, y solo un usuario anotado en `admins` puede crear, editar o borrar. **Nunca** pongas en la web la clave `service_role`.

## Seguridad: qué está cubierto

- Escribir en la base y subir archivos exige iniciar sesión y estar en la lista `admins` (Row Level Security).
- Registro de usuarios desactivado, contraseñas de 8+ caracteres y límite de intentos de Supabase.
- Todo lo que el cliente escribe se muestra como texto: no se puede inyectar código en la web.
- La web solo carga scripts propios (Content-Security-Policy); el panel además usa la librería de Supabase con verificación de integridad (SRI).
- Las fotos se achican y se vuelven a guardar como JPEG al subirlas, lo que también borra la ubicación GPS del celular.
- HTTPS obligatorio (GitHub Pages).

El acceso escondido es solo comodidad: la seguridad real es el usuario y la contraseña.

## Plan gratuito

Supabase puede pausar los proyectos gratuitos que pasan una semana sin actividad. Si pasa, se reactiva con un clic desde el panel de Supabase, y mientras tanto la web muestra el catálogo fijo. Si el cliente quiere evitarlo del todo, existe el plan pago de Supabase.
