'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const ts = require('typescript');
const {postgresSkip, withPostgresSchema} = require('./helpers/postgres');

const projectRoot = path.resolve(__dirname, '..');

require.extensions['.ts'] = function transpileTypeScript(module, filename) {
    const source = fs.readFileSync(filename, 'utf8');
    const result = ts.transpileModule(source, {
        compilerOptions: {esModuleInterop:true, module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2020},
        fileName: filename,
    });
    module._compile(result.outputText, filename);
};

const leer = relativo => fs.readFileSync(path.join(projectRoot, relativo), 'utf8');
const instalar = (db, archivo) => db.query(leer(`install/${archivo}`));

const SECTORES = `
    CREATE TABLE sectores(sector text PRIMARY KEY, sigla text, nombre_sector text, activo boolean NOT NULL DEFAULT true);
    INSERT INTO sectores(sector, sigla, nombre_sector) VALUES
        ('S1', 'SIS', 'DIRECCION SISTEMAS'),
        ('S2', 'GEO', 'DIRECCION GEOESTADISTICA'),
        ('X3', NULL, '(inac) DEPARTAMENTO ESTADISTICAS FISCALES');
`;

const TABLAS = [
    {tabla:'movimientos_bien', alta:"INSERT INTO movimientos_bien(ficha, orden, sector) VALUES ('1', $1, $2)", clave:'orden'},
    {tabla:'movimientos_solicitudes', alta:'INSERT INTO movimientos_solicitudes(acta, sector) VALUES ($1, $2)', clave:'acta'},
];

async function basico(run){
    return withPostgresSchema(async db => {
        await db.query(`${SECTORES}
            CREATE TABLE movimientos_bien(ficha text, orden bigint, sector text REFERENCES sectores ON UPDATE CASCADE,
                sector_sigla text, sector_nombre text, detalle text, PRIMARY KEY(ficha, orden));
            CREATE TABLE movimientos_solicitudes(acta bigint PRIMARY KEY, sector text REFERENCES sectores ON UPDATE CASCADE,
                sector_sigla text, sector_nombre text, detalle text);
        `);
        await instalar(db, 'sector_texto_trg.sql');
        return run(db);
    });
}

const textoDe = async (db, {tabla, clave}, id) => {
    const {rows} = await db.query(`SELECT sector, sector_sigla, sector_nombre FROM ${tabla} WHERE ${clave} = $1`, [id]);
    return rows[0];
};

for (const t of TABLAS) {
    test(`${t.tabla}: el alta guarda la sigla y el nombre del sector`, {skip:postgresSkip}, () => basico(async db => {
        await db.query(t.alta, [1, 'S1']);
        await db.query(t.alta, [2, null]);
        await db.query(t.alta, [3, 'X3']);
        assert.deepEqual(await textoDe(db, t, 1), {sector:'S1', sector_sigla:'SIS', sector_nombre:'DIRECCION SISTEMAS'});
        assert.deepEqual(await textoDe(db, t, 2), {sector:null, sector_sigla:null, sector_nombre:null});
        assert.deepEqual(await textoDe(db, t, 3),
            {sector:'X3', sector_sigla:null, sector_nombre:'(inac) DEPARTAMENTO ESTADISTICAS FISCALES'});
    }));

    test(`${t.tabla}: el alta no acepta un texto que no sea el del catálogo`, {skip:postgresSkip}, () => basico(async db => {
        await db.query(`INSERT INTO ${t.tabla}(${t.clave === 'orden' ? 'ficha, orden' : 'acta'}, sector, sector_sigla, sector_nombre)
            VALUES (${t.clave === 'orden' ? "'1', 1" : '1'}, 'S1', 'OTRA', 'OTRO NOMBRE')`);
        assert.deepEqual(await textoDe(db, t, 1), {sector:'S1', sector_sigla:'SIS', sector_nombre:'DIRECCION SISTEMAS'});
    }));

    test(`${t.tabla}: el texto no sigue al catálogo cuando el sector se renombra o se da de baja`, {skip:postgresSkip}, () => basico(async db => {
        await db.query(t.alta, [1, 'S1']);
        await db.query("UPDATE sectores SET sigla = 'TEC', nombre_sector = 'DIRECCION DE TECNOLOGIA', activo = false WHERE sector = 'S1'");
        await db.query(`UPDATE ${t.tabla} SET detalle = 'otro dato' WHERE ${t.clave} = 1`);
        await db.query(t.alta, [2, 'S1']);
        assert.deepEqual(await textoDe(db, t, 1), {sector:'S1', sector_sigla:'SIS', sector_nombre:'DIRECCION SISTEMAS'});
        assert.deepEqual(await textoDe(db, t, 2), {sector:'S1', sector_sigla:'TEC', sector_nombre:'DIRECCION DE TECNOLOGIA'});
    }));

    test(`${t.tabla}: al elegir otro sector toma su texto, y al quitarlo queda vacío`, {skip:postgresSkip}, () => basico(async db => {
        await db.query(t.alta, [1, 'S1']);
        await db.query(`UPDATE ${t.tabla} SET sector = 'S2' WHERE ${t.clave} = 1`);
        assert.deepEqual(await textoDe(db, t, 1), {sector:'S2', sector_sigla:'GEO', sector_nombre:'DIRECCION GEOESTADISTICA'});
        await db.query(`UPDATE ${t.tabla} SET sector = NULL WHERE ${t.clave} = 1`);
        assert.deepEqual(await textoDe(db, t, 1), {sector:null, sector_sigla:null, sector_nombre:null});
        await db.query(`UPDATE ${t.tabla} SET sector = 'S1' WHERE ${t.clave} = 1`);
        assert.deepEqual(await textoDe(db, t, 1), {sector:'S1', sector_sigla:'SIS', sector_nombre:'DIRECCION SISTEMAS'});
    }));

    test(`${t.tabla}: el texto guardado no se edita a mano`, {skip:postgresSkip}, () => basico(async db => {
        await db.query(t.alta, [1, 'S1']);
        await db.query(`UPDATE ${t.tabla} SET sector_sigla = 'OTRA', sector_nombre = 'OTRO NOMBRE' WHERE ${t.clave} = 1`);
        assert.deepEqual(await textoDe(db, t, 1), {sector:'S1', sector_sigla:'SIS', sector_nombre:'DIRECCION SISTEMAS'});
    }));

    test(`${t.tabla}: un cambio de código del sector conserva el texto`, {skip:postgresSkip}, () => basico(async db => {
        await db.query(t.alta, [1, 'S1']);
        await db.query("UPDATE sectores SET sigla = 'TEC', nombre_sector = 'DIRECCION DE TECNOLOGIA' WHERE sector = 'S1'");
        await db.query("UPDATE sectores SET sector = 'S9' WHERE sector = 'S1'");
        assert.deepEqual(await textoDe(db, t, 1), {sector:'S9', sector_sigla:'SIS', sector_nombre:'DIRECCION SISTEMAS'});
    }));
}

async function circuito(run){
    return withPostgresSchema(async db => {
        await db.query(`${SECTORES}
            CREATE FUNCTION get_app_user(campo text DEFAULT NULL) RETURNS text LANGUAGE sql AS
                $$ SELECT CASE WHEN campo='rol' THEN 'admin' ELSE 'tester' END $$;
            CREATE TABLE roles(rol text primary key, puede_guardar boolean, puede_mover boolean);
            INSERT INTO roles VALUES ('admin',true,true);
            CREATE TABLE bienes(ficha text primary key, activo boolean NOT NULL DEFAULT true);
            CREATE TABLE espacios(espacio text primary key, sector text, sede text);
            CREATE TABLE movimientos_solicitudes(acta bigint primary key, estado text default 'B',
                tipo_asignacion text, accion text, modalidad_uso text, responsable text,
                sector text REFERENCES sectores ON UPDATE CASCADE, sector_sigla text, sector_nombre text,
                sede text, espacio text, puesto integer, usuario_final text, enusode text, enusode_responsable text,
                detalle text, autorizado_por text, firmado_por text, fecha_creacion date default current_date,
                fecha_modificacion date, usuario_creacion text, usuario_modificacion text,
                acta_rectificada bigint);
            CREATE TABLE movimientos_bien(ficha text REFERENCES bienes, orden bigint NOT NULL,
                tipo_asignacion text, accion text, modalidad_uso text, responsable text,
                sector text REFERENCES sectores ON UPDATE CASCADE, sector_sigla text, sector_nombre text,
                sede text, espacio text, puesto integer, enusode text, enusode_responsable text,
                detalle text, autorizado_por text, firmado_por text, fecha_movimiento date,
                fecha_creacion date, fecha_modificacion date, usuario_creacion text,
                acta_origen bigint REFERENCES movimientos_solicitudes,
                PRIMARY KEY(ficha,orden), UNIQUE(acta_origen,ficha));
            CREATE TABLE movimientos_solicitud_bien(acta bigint REFERENCES movimientos_solicitudes,
                ficha text REFERENCES bienes, observaciones text, verificado boolean, destino jsonb,
                origen jsonb, orden_origen bigint, PRIMARY KEY(acta,ficha));
            CREATE TABLE estados_acciones(estado text, eaccion text, estado_destino text, condicion text);
            INSERT INTO estados_acciones VALUES ('B','presentar','P',null),('P','procesar','Pr',null),('P','volver','B',null);
            CREATE FUNCTION accion_cumple_condicion(bigint,text,text,text) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
            INSERT INTO bienes VALUES ('1',true),('2',true);
            INSERT INTO espacios VALUES ('E1','S1','D1'),('E3','S2','D2');
            INSERT INTO movimientos_bien(ficha,orden,responsable,sector,sede,espacio,fecha_movimiento)
                VALUES ('1',1,'A','S1','D1','E1','2026-09-22'),('2',1,'B','S1','D1','E1','2026-09-22');
        `);
        for (const archivo of ['movimientos_bien_pk_trg.sql', 'movimientos_destino.sql', 'solicitudes_integridad_trg.sql',
            'movimientos_solicitudes_estado_trg.sql', 'sector_texto_trg.sql']) {
            await instalar(db, archivo);
        }
        return run(db);
    });
}

const procesar = (db, acta) => db.query(`
    UPDATE movimientos_solicitudes SET estado='P' WHERE acta=${acta};
    UPDATE movimientos_solicitudes SET estado='Pr' WHERE acta=${acta};`);

test('procesar una solicitud deja sus movimientos con el texto del catálogo de ese momento', {skip:postgresSkip}, () => circuito(async db => {
    await db.query(`INSERT INTO movimientos_solicitudes(acta, sector, espacio) VALUES (10, 'S2', 'E3');
        INSERT INTO movimientos_solicitud_bien(acta, ficha) VALUES (10, '1'), (10, '2');`);
    await db.query("UPDATE sectores SET sigla = 'GEOE' WHERE sector = 'S2'");
    await procesar(db, 10);
    const solicitud = await db.query('SELECT estado, sector_sigla, sector_nombre FROM movimientos_solicitudes WHERE acta = 10');
    assert.deepEqual(solicitud.rows, [{estado:'Pr', sector_sigla:'GEO', sector_nombre:'DIRECCION GEOESTADISTICA'}]);
    const movimientos = await db.query(
        'SELECT ficha, sector, sector_sigla, sector_nombre FROM movimientos_bien WHERE acta_origen = 10 ORDER BY ficha');
    assert.deepEqual(movimientos.rows, [
        {ficha:'1', sector:'S2', sector_sigla:'GEOE', sector_nombre:'DIRECCION GEOESTADISTICA'},
        {ficha:'2', sector:'S2', sector_sigla:'GEOE', sector_nombre:'DIRECCION GEOESTADISTICA'},
    ]);
}));

test('el completado inicial llena lo vacío, no toca nada más y no pisa lo guardado', {skip:postgresSkip}, () => circuito(async db => {
    await db.query(`INSERT INTO movimientos_solicitudes(acta, sector, espacio) VALUES (10, 'S2', 'E3');
        INSERT INTO movimientos_solicitud_bien(acta, ficha) VALUES (10, '1');`);
    await procesar(db, 10);
    await db.query(`
        ALTER TABLE movimientos_bien DISABLE TRIGGER USER;
        ALTER TABLE movimientos_solicitudes DISABLE TRIGGER USER;
        UPDATE movimientos_bien SET sector_sigla = NULL, sector_nombre = NULL;
        UPDATE movimientos_solicitudes SET sector_sigla = NULL, sector_nombre = NULL;
        ALTER TABLE movimientos_bien ENABLE TRIGGER USER;
        ALTER TABLE movimientos_solicitudes ENABLE TRIGGER USER;`);
    const resto = async tabla => (await db.query(
        `SELECT to_jsonb(t) - 'sector_sigla' - 'sector_nombre' AS fila FROM ${tabla} t ORDER BY 1`)).rows;
    const textos = async tabla => (await db.query(
        `SELECT sector, sector_sigla, sector_nombre FROM ${tabla} ORDER BY sector, sector_sigla`)).rows;
    const antes = {movimientos:await resto('movimientos_bien'), solicitudes:await resto('movimientos_solicitudes')};

    await instalar(db, 'sector_texto_inicial.sql');
    assert.deepEqual(await resto('movimientos_bien'), antes.movimientos);
    assert.deepEqual(await resto('movimientos_solicitudes'), antes.solicitudes);
    const completos = [
        {sector:'S1', sector_sigla:'SIS', sector_nombre:'DIRECCION SISTEMAS'},
        {sector:'S1', sector_sigla:'SIS', sector_nombre:'DIRECCION SISTEMAS'},
        {sector:'S2', sector_sigla:'GEO', sector_nombre:'DIRECCION GEOESTADISTICA'},
    ];
    assert.deepEqual(await textos('movimientos_bien'), completos);
    assert.deepEqual(await textos('movimientos_solicitudes'),
        [{sector:'S2', sector_sigla:'GEO', sector_nombre:'DIRECCION GEOESTADISTICA'}]);
    await assert.rejects(db.query("UPDATE movimientos_bien SET detalle = 'x' WHERE acta_origen = 10"), /solicitud/i);

    await db.query("UPDATE sectores SET sigla = 'TEC', nombre_sector = 'DIRECCION DE TECNOLOGIA' WHERE sector = 'S1'");
    await instalar(db, 'sector_texto_inicial.sql');
    assert.deepEqual(await textos('movimientos_bien'), completos);
}));

test('la consulta de movimientos muestra el sector de origen y de destino con el texto guardado', {skip:postgresSkip}, () => withPostgresSchema(async db => {
    const {sqlMovimientosConsulta} = require(path.join(projectRoot, 'src/server/table-movimientos_consulta.ts'));
    await db.query(`${SECTORES}
        CREATE TABLE bienes(ficha text PRIMARY KEY, detalle text, grupo text, marca text, modelo text, serie text);
        CREATE TABLE grupos(grupo text, descripcion text);
        CREATE TABLE marcas(marca text, descripcion text);
        CREATE TABLE responsables(responsable text, apellido text, nombre text);
        CREATE TABLE espacios(espacio text, numero text, denominacion text);
        CREATE TABLE acciones_movimiento(accion_movimiento text, descripcion text);
        CREATE TABLE movimientos_bien(ficha text, orden bigint, fecha_movimiento date, momento timestamp,
            sector text REFERENCES sectores ON UPDATE CASCADE, sector_sigla text, sector_nombre text,
            responsable text, espacio text, accion text, acta_origen bigint, usuario_creacion text, detalle text,
            PRIMARY KEY(ficha, orden));
        CREATE TABLE movimientos_solicitudes(acta bigint PRIMARY KEY, sector text, sector_sigla text, sector_nombre text);
        INSERT INTO bienes(ficha) VALUES ('10231');
    `);
    await instalar(db, 'sector_texto_trg.sql');
    await db.query("INSERT INTO movimientos_bien(ficha, orden, sector) VALUES ('10231', 1, 'S1'), ('10231', 2, 'X3')");
    await db.query("UPDATE sectores SET sigla = 'TEC', nombre_sector = 'DIRECCION DE TECNOLOGIA' WHERE sector = 'S1'");
    await db.query("INSERT INTO movimientos_bien(ficha, orden, sector) VALUES ('10231', 3, 'S1')");
    const {rows} = await db.query(`SELECT orden::int, de_sector, a_sector FROM (${sqlMovimientosConsulta}) x ORDER BY orden`);
    assert.deepEqual(rows, [
        {orden:1, de_sector:null, a_sector:'S1 — SIS'},
        {orden:2, de_sector:'S1 — SIS', a_sector:'X3 — (inac) DEPARTAMENTO ESTADISTICAS FISCALES'},
        {orden:3, de_sector:'X3 — (inac) DEPARTAMENTO ESTADISTICAS FISCALES', a_sector:'S1 — TEC'},
    ]);
}));

test('las dos tablas declaran el texto del sector como no editable y sin leerlo de la referencia', () => {
    const contexto = {user:{rol:'admin'}, es:{admin:true, administrativo:true}, be:{config:{}}};
    const {movimientos_bien} = require(path.join(projectRoot, 'src/server/table-movimientos_bien.ts'));
    const {movimientos_solicitudes} = require(path.join(projectRoot, 'src/server/table-movimientos_solicitudes.ts'));
    for (const def of [movimientos_bien(contexto), movimientos_solicitudes(contexto)]) {
        for (const nombre of ['sector_sigla', 'sector_nombre']) {
            const campo = def.fields.find(f => f.name === nombre);
            assert.ok(campo, `${def.name}.${nombre} no existe`);
            assert.equal(campo.editable, false);
            assert.equal(campo.inTable, undefined);
            assert.ok(campo.title, `${def.name}.${nombre} no tiene título`);
        }
        assert.deepEqual(def.foreignKeys.find(fk => fk.references === 'sectores').displayFields, []);
    }
});

test('el trigger y el completado inicial están registrados en el dump, en ese orden', () => {
    const config = leer('src/server/def-config.ts');
    const trigger = config.indexOf('../install/sector_texto_trg.sql');
    const inicial = config.indexOf('../install/sector_texto_inicial.sql');
    assert.ok(trigger > config.indexOf('post-adapt:'));
    assert.ok(inicial > trigger);
});
