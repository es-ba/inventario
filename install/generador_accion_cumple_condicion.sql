CREATE OR REPLACE FUNCTION regenerar_accion_cumple_condicion_trg()
  RETURNS trigger 
  LANGUAGE plpgsql
  SECURITY DEFINER AS
$CREATOR$
DECLARE
  xcase_condiciones TEXT;
  v_sql text := $SQL_CON_TAG$

CREATE OR REPLACE FUNCTION accion_cumple_condicion(
    p_acta text,
    p_estado text,
    p_eaccion text,
    p_condicion text)
    RETURNS boolean
    LANGUAGE SQL
    STABLE
AS $SQL$    
    -- ¡ATENCIÓN! NO MODIFICAR MANUALMENTE ESTA FUNCIÓN FUE GENERADA CON EL SCRIPT generador_accion_cumple_condicion.sql
  select true
    from movimientos_solicitudes m
    inner join estados_acciones ea ON ea.estado = m.estado
    left join movimientos_solicitud_bien msb ON msb.acta = m.acta
    where m.acta = p_acta
    and ea.eaccion = p_eaccion
    and m.estado = p_estado
    and
    -- COMIENZA LA PARTE GENERADA DINÁMICAMENTE:
      /**xcase_condiciones**/
    -- FIN DE LA GENERADA DINÁMICAMENTE:
    ;
    $SQL$;

$SQL_CON_TAG$;
BEGIN

 SELECT 'CASE p_condicion' || 
    string_agg(distinct chr(10) || lpad(' ',8)|| 'WHEN ' || quote_literal(condicion) || ' THEN ' || condicion, '') 
    ||chr(10) ||lpad(' ',6)|| 'END'
  INTO xcase_condiciones 
  FROM estados_acciones;
  
  execute replace(v_sql,'/**xcase_condiciones**/',xcase_condiciones);
  RETURN new;
END;
$CREATOR$;

CREATE OR REPLACE TRIGGER update_accion_cumple_condicion_trg
    AFTER UPDATE of condicion
    ON estados_acciones
    FOR EACH ROW
    EXECUTE FUNCTION regenerar_accion_cumple_condicion_trg();

with aux as (select * from estados_acciones limit 1)
update estados_acciones ea
  set condicion=aux.condicion
  from aux 
  where ea.estado=aux.estado and
    ea.eaccion=aux.eaccion and
    ea.estado_destino=aux.estado_destino;