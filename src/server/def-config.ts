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
  # El sector no está en usuarios sino en responsables, así que el login lee las dos.
  # Es la forma de siper (usuarios left join personas using (idper)). El "using" es lo que
  # hace que funcione: fusiona la columna repetida, y sin él "responsable" quedaría
  # ambiguo entre las dos tablas.
  from: usuarios left join responsables using (responsable)
  userFieldName: usuario
  passFieldName: md5clave
  rolFieldName: rol
  # Lo que backend-plus publica como variable de sesión de PostgreSQL al entrar
  # (set_app_user) y las policies leen con get_app_user('...'). responsable y sector están
  # acá para que "lo mío" y "mis dependientes" sean constantes y no subconsultas por fila.
  infoFieldList: [usuario, rol, responsable, sector]
  # Calificado a propósito: con el join, "activo" existe en las dos tablas. La que decide
  # si se puede entrar es la de la cuenta, no la de la persona.
  activeClausule: usuarios.activo
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
      - ../install/sector_pertenece.sql
      - ../install/auditoria_usuario_trg.sql
      - ../install/responsables_id_trg.sql
      - ../install/movimientos_solicitudes_estado_trg.sql
      - ../install/trazabilidad_atributos_documentacion_trg.sql
      - ../install/declaraciones_estado_trg.sql
      - ../install/solicitudes_documentos_trg.sql
logo: 
  path: client/img
`;
