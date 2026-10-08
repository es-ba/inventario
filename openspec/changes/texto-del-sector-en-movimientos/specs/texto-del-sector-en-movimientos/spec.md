# Spec Delta

## Purpose

Conservar, en cada movimiento y en cada solicitud, la sigla y el nombre que el sector tenía cuando se lo eligió, para que la historia de un bien no cambie cuando el organigrama cambia.

## ADDED Requirements

### Requirement: El movimiento guarda el texto de su sector
Al registrarse un movimiento con sector, el sistema SHALL guardar junto al código la sigla y el nombre que ese sector tiene en el catálogo en ese momento. Esto SHALL valer para los movimientos que salen de una solicitud y para los que se hacen sin solicitud. Un movimiento sin sector SHALL quedar sin texto de sector.

#### Scenario: Movimiento sin solicitud
- **WHEN** el sector `242` figura como `SIS`, "DIRECCION SISTEMAS", y se mueve la ficha `8841` al sector `242`
- **THEN** el movimiento queda con sector `242`, sigla `SIS` y nombre "DIRECCION SISTEMAS"

#### Scenario: Movimiento que sale de una solicitud
- **WHEN** se procesa una solicitud con 3 bienes cuyo destino es el sector `242`
- **THEN** los 3 movimientos quedan con la sigla y el nombre que `242` tiene al procesarla

#### Scenario: Movimiento sin sector
- **WHEN** se registra un movimiento que sólo cambia el responsable directo y no tiene sector
- **THEN** el movimiento queda sin sigla ni nombre de sector

### Requirement: La solicitud guarda el texto de su sector
Al cargar una solicitud con sector, o al cambiarle el sector, el sistema SHALL guardar la sigla y el nombre que ese sector tiene en el catálogo en ese momento. Si se le quita el sector, el texto SHALL quedar vacío.

#### Scenario: Solicitud nueva
- **WHEN** se carga una solicitud con destino al sector `2422`, que figura como `SINFOR-1`, "DEPARTAMENTO DESARROLLO DE SOFTWARE"
- **THEN** la solicitud queda con esa sigla y ese nombre

#### Scenario: Cambio de sector en borrador
- **WHEN** una solicitud en borrador pasa del sector `2422` al sector `2421`
- **THEN** la solicitud queda con la sigla y el nombre de `2421`

#### Scenario: Se quita el sector
- **WHEN** a una solicitud en borrador se le borra el sector
- **THEN** la solicitud queda sin sigla ni nombre de sector

### Requirement: El texto guardado no sigue al catálogo
La sigla y el nombre guardados en un movimiento o en una solicitud SHALL NOT cambiar cuando el sector cambia de sigla, de nombre o de código, ni cuando se lo da de baja. SHALL cambiar sólo cuando a esa fila se le elige otro sector.

#### Scenario: El sector cambia de nombre
- **WHEN** un movimiento de agosto quedó con `SIS`, "DIRECCION SISTEMAS", y en octubre el sector `242` pasa a llamarse "DIRECCION DE TECNOLOGIA" con sigla `TEC`
- **THEN** el movimiento de agosto sigue con `SIS`, "DIRECCION SISTEMAS"
- **AND** un movimiento nuevo al sector `242` queda con `TEC`, "DIRECCION DE TECNOLOGIA"

#### Scenario: El sector se da de baja
- **WHEN** el sector `242` se marca como inactivo
- **THEN** sus movimientos y solicitudes conservan la sigla y el nombre guardados

#### Scenario: El sector cambia de código
- **WHEN** el sector `242` pasa a tener el código `342` y un movimiento sin solicitud lo tenía con `SIS`, "DIRECCION SISTEMAS"
- **THEN** ese movimiento queda con sector `342` y conserva `SIS`, "DIRECCION SISTEMAS"

### Requirement: El texto guardado no se edita a mano
El sistema SHALL ignorar cualquier intento de escribir la sigla o el nombre guardados que no venga de elegir un sector. Los campos SHALL mostrarse como no editables.

#### Scenario: Intento de corregir el nombre
- **WHEN** un administrador intenta cambiar el nombre de sector guardado en un movimiento, sin cambiarle el sector
- **THEN** el movimiento conserva el nombre que tenía

#### Scenario: Cambio de estado de una solicitud cerrada
- **WHEN** una solicitud que ya salió de borrador cambia de estado
- **THEN** el cambio se acepta y la sigla y el nombre guardados quedan iguales

### Requirement: Las vistas históricas muestran el texto guardado
La consulta de movimientos (pantalla, grilla y solapa Movimientos de la solicitud), el "de dónde a dónde" de los movimientos del calendario, el historial de la ficha, la grilla de movimientos y el listado de solicitudes SHALL mostrar el sector con el texto guardado en la fila, no con el del catálogo actual.

En la consulta, el calendario y el historial el sector SHALL mostrarse como "código — sigla"; el listado de solicitudes SHALL seguir mostrando la sigla sola, como hasta ahora. Si la sigla guardada está vacía, en su lugar SHALL usarse el nombre guardado. El origen de un movimiento ("de") SHALL usar el texto guardado en el movimiento anterior del mismo bien.

#### Scenario: Consulta después de un renombre
- **WHEN** el sector `242` se renombró a `TEC` y se consulta un movimiento de agosto que llegó a ese sector
- **THEN** la fila muestra "242 — SIS" como destino

#### Scenario: Origen con el texto del movimiento anterior
- **WHEN** la ficha `10231` llegó a `242` en agosto, el sector se renombró a `TEC` en octubre y en noviembre la ficha se mueve al sector `243`
- **THEN** la fila de noviembre muestra "242 — SIS" como origen

#### Scenario: Sector sin sigla
- **WHEN** un movimiento quedó con el sector `X3`, sin sigla y con nombre "(inac) DEPARTAMENTO ESTADISTICAS FISCALES"
- **THEN** la fila muestra "X3 — (inac) DEPARTAMENTO ESTADISTICAS FISCALES"

#### Scenario: Historial de la ficha
- **WHEN** se abre el historial de un bien con un movimiento al sector `242` guardado como `SIS`
- **THEN** el detalle de ese movimiento dice "sector 242 — SIS"

#### Scenario: Listado de solicitudes
- **WHEN** una solicitud de agosto quedó con `SIS` y el sector hoy es `TEC`
- **THEN** el listado la muestra con `SIS` y se la encuentra buscando `SIS` o "DIRECCION SISTEMAS"

### Requirement: Las vistas del estado actual siguen al catálogo
La búsqueda de bienes, la vista rápida, la ficha, los reportes y el control de bienes SHALL seguir mostrando el sector con la sigla y el nombre actuales del catálogo. Los selectores de las pantallas de carga SHALL seguir ofreciendo el catálogo actual.

#### Scenario: Bien en un sector renombrado
- **WHEN** el sector `242` se renombró a `TEC` y un bien sigue asignado a ese sector
- **THEN** la búsqueda de bienes y la vista rápida lo muestran en "242 — TEC"

### Requirement: Los registros anteriores se completan una sola vez
Al aplicar el cambio, los movimientos y las solicitudes que ya existen y tienen sector SHALL quedar con la sigla y el nombre que ese sector tiene en el catálogo en ese momento. Completar SHALL NOT modificar ningún otro dato de la fila ni pisar un texto ya guardado.

#### Scenario: Movimiento de la carga inicial
- **WHEN** se aplica el cambio y un movimiento del 22/09/2026 tiene el sector `242`, que hoy figura como `SIS`
- **THEN** ese movimiento queda con `SIS`, "DIRECCION SISTEMAS", y conserva su fecha, su usuario y su fecha de modificación

#### Scenario: Movimiento que viene de una solicitud
- **WHEN** se aplica el cambio y existe un movimiento generado por la solicitud 57
- **THEN** ese movimiento queda completado igual que los demás

#### Scenario: Se vuelve a completar
- **WHEN** el completado se corre por segunda vez, después de que el sector `242` se renombró
- **THEN** los movimientos que ya tenían texto guardado no cambian
