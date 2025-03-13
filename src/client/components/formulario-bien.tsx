import { useState, useEffect } from "react";
import * as React from "react";
import { TextField, Button } from "@mui/material";

type FormularioBienProps = {
    bien: Bien;
    onSubmit: (bien: Bien) => void;
    isEditing?: boolean;
};

export default function FormularioBien({ bien: initialBien, onSubmit, isEditing = false }: FormularioBienProps) {
    const [bien, setBien] = useState<Bien>(initialBien);

    useEffect(() => {
        setBien(initialBien);
    }, [initialBien]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setBien({ ...bien, [name]: value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(bien);
    };

    return (
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
            <Button type="submit" variant="contained" color="primary">
                {isEditing ? "Actualizar" : "Agregar"}
            </Button>
        </form>
    );
}
