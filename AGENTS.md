# inventario

Sistema de inventario para el IDECBA (Instituto de Estadística y Censos de la Ciudad Autónoma de Buenos Aires). Backend basado en `backend-plus` + PostgreSQL.

## Estructura del proyecto

- `src/server/` — código del servidor (TypeScript). Define tablas (`table-*.ts`), procedures, app principal, configuración.
- `src/client/` — código del cliente legacy embebido en `backend-plus` (grilla clásica). Aquí se agregan `clientSides`.
- `src/unlogged/` — código para la pantalla de login y vistas no autenticadas.
- `src/common/` — tipos y contratos compartidos entre cliente y servidor.
- `install/` — scripts SQL aplicados durante el `dump`/`adapt` (triggers, funciones).
- `dist/` — output de la compilación.

## Frontend React

El **frontend nuevo en React** del proyecto vive en un repo separado:

```
C:\Users\GCBA\Documents\GitHub\frontend-inventario
```

Cuando se trate de cambios en UI moderna (React, Vite, MUI, react-redux), trabajar en esa carpeta. El `src/client/` de este repo es la grilla legacy de `backend-plus`.

## Comandos útiles

- `npm run build` — compila cliente + server + unlogged + mixin-patch.
- `npm run build-ignore-error` — compila ignorando errores de TS y corre webpack.
- `npm start` — arranca el servidor (`dist/server/server-principal.js`).
- `npm run dump` — corre el server con `--dump-db` (aplica los SQLs de `install/` definidos en `def-config.ts`).
- `npm run watch:buildS` — TypeScript watch mode del servidor.

## Convenciones del backend (`backend-plus`)

- **Tablas:** una función por archivo en `src/server/table-*.ts` que devuelve un `TableDefinition`.
- **Registro de tablas:** se agregan al método `prepareGetTables()` de `AppInventario` en `app-principal.ts`.
- **Procedures:** se exportan en el array `ProceduresInventario` en `procedures-principal.ts`.
- **Endpoints custom:** se registran en `addSchrödingerServices` (autenticación opcional) o `addUnloggedServices` (público).
- **Secuencias autonumeradoras:** definir el campo con `{...field, sequence:{ firstValue:N, name:'mi_seq' }}` y backend-plus las crea via adapt.
- **Triggers SQL custom:** agregarlos a `install/*.sql` y registrarlos en `def-config.ts` bajo `install.dump.scripts.pre-adapt` o `post-adapt`.

## Adjuntos a bienes

La tabla `adjuntos_bienes` permite asociar N archivos por bien. PK compuesta `(ficha, numero_adjunto)`. El procedure `archivo_subir` recibe el archivo via multipart y lo guarda en `local-attachments/<ficha>/<filename>`. Endpoint de descarga: `GET /download/adjunto_bien?ficha=...&numero_adjunto=...`. Borrado físico diferido por cron a las 23:58 vía tabla `archivos_borrar` + trigger `archivo_borrar_trg`.
