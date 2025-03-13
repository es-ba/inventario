import { useState, useEffect } from "react";
import * as React from "react";
import { useParams } from "react-router-dom";
import { Paper, Typography } from "@mui/material";
import FormularioBien from "../components/formulario-bien";

type EditarBienProps = {
    onInsert?: (bien: Bien) => void;
    onUpdate?: (bien: Bien) => void;
};

function useBienPorFicha(ficha: string | undefined) {
    const [bien, setBien] = useState<Bien | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        async function fetchBien() {
            if (!ficha) {
                setBien(null);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const rows = await my.ajax.table_data({
                    table: "bienes",
                    fixedFields: [{ fieldName: "ficha", value: ficha }],
                    paramfun: {}
                });
                setBien(rows[0] as Bien);
            } catch (err) {
                setError(err instanceof Error ? err : new Error(String(err)));
            } finally {
                setLoading(false);
            }
        }
        
        fetchBien();
    }, [ficha]);

    return { bien, loading, error };
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
            fecha: bien.fecha || null
        },
        oldRow: {}
    });
}

export default function EditarBienPage({ onInsert, onUpdate }: EditarBienProps) {
    const { ficha } = useParams();
    const [bien, setBien] = useState<Bien | null>(null);

    const isEditing = Boolean(ficha);
    const { bien: bienEncontrado, loading, error } = useBienPorFicha(ficha);

    useEffect(() => {
        if (isEditing && ficha) {
            if (error) {
                console.error("Error al traer el bien", error);
            } else if (!loading && bienEncontrado) {
                setBien(bienEncontrado);
            }
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
                fecha: "",
            };
            setBien(bienNuevo);
        }
    }, [isEditing, ficha, bienEncontrado, loading, error]);

    const handleSubmit = async (bien: Bien) => {
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
                <FormularioBien bien={bien} onSubmit={handleSubmit} isEditing={isEditing} />
            </Paper>
        </div>
    );
}
