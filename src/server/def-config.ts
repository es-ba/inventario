export const staticConfigYaml=`
server:
  port: 3021
  session-store: memory-saved
  skins:
    modern:
      local-path: node_modules/backend-skins/dist
db:
  motor: postgresql
  host: localhost
  database: inventario_db
  schema: inventario
  user: inventario_admin
login:
  table: usuarios
  userFieldName: usuario
  passFieldName: md5clave
  rolFieldName: rol
  infoFieldList: [usuario, rol]
  activeClausule: activo
  unloggedLandPage: false
  plus:
    successRedirect: /menu#i=principal
    allowHttpLogin: true
    fileStore: true
    loginForm:
      formTitle: entrada
      formImg: unlogged/tables-lock.png
    noLoggedUrlPath: /login
client-setup:
  skin: modern
  menu: true
  lang: es
  user-scalable: no
install:
  dump:
    db:
      owner: inventario_owner
    scripts:
      pre-adapt:
      - ../install/movimientos_bien_pk_trg.sql
      - ../install/evento_bien_pk_trg.sql
      - ../install/historial_bien_acciones_trg.sql
      - ../install/archivo_borrar_trg.sql
      post-adapt:
      - ../node_modules/pg-triggers/lib/recreate-his.sql
      - ../node_modules/pg-triggers/lib/table-changes.sql
      - ../node_modules/pg-triggers/lib/function-changes-trg.sql
      - ../node_modules/pg-triggers/lib/enance.sql    
      - ../install/generador_accion_cumple_condicion.sql
      - ../install/movimientos_solicitudes_estado_trg.sql
      - ../install/trazabilidad_atributos_documentacion_trg.sql
logo: 
  path: client/img
`;
