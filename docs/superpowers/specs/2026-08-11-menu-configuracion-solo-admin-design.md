# Configuración visible únicamente para administradores

## Objetivo

Restringir la visibilidad de la opción **Configuración** del menú al rol `admin`, manteniendo sin cambios el resto del menú y los permisos de acceso a las tablas.

## Comportamiento esperado

- El rol `admin` ve todas las opciones actuales: Principal, Inventario, Operaciones, Gestión de datos y Configuración.
- Los roles distintos de `admin` conservan las opciones generales que ven actualmente.
- Configuración y todos sus submenús solamente aparecen para el rol `admin`.
- El cambio afecta exclusivamente la construcción del menú del backend-plus.
- No se modifica React ni la autorización de acceso directo a tablas o procedimientos.

## Diseño

En `AppInventario.getMenu()` se conservará la construcción actual de las opciones generales. La condición que incorpora Configuración dejará de depender del nivel acumulativo `context.es.administrativo` y pasará a comprobar específicamente `context.es.admin`.

Esta solución reutiliza la clasificación de roles calculada por `completeContext()` y evita duplicar el contenido del menú o reorganizar los permisos existentes.

## Verificación

Se incorporará una prueba de `getMenu()` que compruebe:

- Configuración está presente para `admin`.
- Configuración no está presente para `superior`, `administrativo` ni `lectura`.
- El rol `admin` continúa viendo las opciones generales del menú.

También se ajustarán las pruebas existentes únicamente si alguna expectativa contradice explícitamente este comportamiento.

