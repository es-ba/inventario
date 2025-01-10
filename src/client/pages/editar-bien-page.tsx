import { useState, useEffect } from "react";
import * as React from "react";
import { useParams } from "react-router-dom";
import { TextField, Button, Paper, Typography } from "@mui/material";

type EditarBienProps = {
    onInsert?: (bien: Bien) => void;
    onUpdate?: (bien: Bien) => void;
};

async function traerBienPorFicha(ficha: string) {
    const rows = await my.ajax.table_data({
        table: "bienes",
        fixedFields: [{ fieldName: "ficha", value: ficha }],
        paramfun: {}
    });
    return rows[0] as Bien;
}

async function guardarBien(bien: Bien, isEditing: boolean) {
  return await my.ajax.table_record_save({
    table: "bienes",
    status: isEditing ? "edit" : "new",
    primaryKeyValues: isEditing ? [bien.ficha] : [],
    newRow: {
      ficha: bien.ficha,
      observacion: bien.observacion,
      serie: bien.serie,
      espacio: bien.espacio,
      area: bien.area,
      responsable: bien.responsable,
      grupo: bien.grupo,
      detalle: bien.detalle,
      opciones: bien.opciones,
      integrado: bien.integrado || null,
      fecha: bien.fecha || null
    },
    oldRow: {}
  });
}

export default function EditarBienPage({ onInsert, onUpdate }: EditarBienProps) {
    const { ficha } = useParams();
    const [bien, setBien] = useState<Bien | null>(null);

    const isEditing = Boolean(ficha);

    useEffect(() => {
        if (isEditing && ficha) {
        (async () => {
            try {
            const bienEncontrado = await traerBienPorFicha(ficha);
            setBien(bienEncontrado);
            } catch (err) {
            console.error("Error al traer el bien", err);
            }
        })();
        } else {
        const bienNuevo: Bien = {
            ficha: "",
            observacion: "",
            serie: "",
            espacio: "",
            area: "",
            responsable: "",
            grupo: "",
            detalle: "",
            opciones: "",
            fecha: "",
            integrado: ""
        };
        setBien(bienNuevo);
        }
    }, [isEditing, ficha]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        if (!bien) return;
        const { name, value } = e.target;
        setBien({ ...bien, [name]: value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bien) return;

        try {
        const resp = await guardarBien(bien, isEditing);
        console.log("Bien guardado:", resp);

        if (isEditing) {
            onUpdate?.(bien);
        } else {
            onInsert?.(bien);
        }
        } catch (err) {
        console.error("Error al guardar el bien:", err);
        }
    };

    if (!bien) {
        return <div>Cargando bien...</div>;
    }

    return (
        <div style={{ padding: 20 }}>
        <Paper style={{ padding: 16 }}>
            <Typography variant="h6">
            {isEditing ? "Editar Bien" : "Agregar Bien"}
            </Typography>
            <form onSubmit={handleSubmit}>
            <TextField
                label="Ficha"
                name="ficha"
                value={bien.ficha}
                onChange={handleChange}
                fullWidth
                margin="normal"
                disabled={isEditing} 
            />
            <TextField
                label="Integrado"
                name="integrado"
                value={bien.integrado ?? ""}
                onChange={handleChange}
                fullWidth
                margin="normal"
            />
            <TextField
                label="Observación"
                name="observacion"
                value={bien.observacion}
                onChange={handleChange}
                fullWidth
                margin="normal"
            />
            <TextField
                label="Fecha"
                type="date"
                name="fecha"
                value={bien.fecha || ""}
                onChange={handleChange}
                fullWidth
                margin="normal"
                InputLabelProps={{
                shrink: true
                }}
            />
            <TextField
                label="Serie"
                name="serie"
                value={bien.serie}
                onChange={handleChange}
                fullWidth
                margin="normal"
            />

            <TextField
                label="Espacio"
                name="espacio"
                value={bien.espacio}
                onChange={handleChange}
                fullWidth
                margin="normal"
            />
            <TextField
                label="Área"
                name="area"
                value={bien.area}
                onChange={handleChange}
                fullWidth
                margin="normal"
            />
            <TextField
                label="Responsable"
                name="responsable"
                value={bien.responsable}
                onChange={handleChange}
                fullWidth
                margin="normal"
            />
            <TextField
                label="Grupo"
                name="grupo"
                value={bien.grupo}
                onChange={handleChange}
                fullWidth
                margin="normal"
            />
            <TextField
                label="Detalle"
                name="detalle"
                value={bien.detalle}
                onChange={handleChange}
                fullWidth
                margin="normal"
            />
            <TextField
                label="Opciones"
                name="opciones"
                value={bien.opciones}
                onChange={handleChange}
                fullWidth
                margin="normal"
            />

            <Button type="submit" variant="contained" color="primary">
                {isEditing ? "Actualizar" : "Agregar"}
            </Button>
            </form>
        </Paper>
        </div>
    );
}
