import * as React from "react";
import { useState } from "react";
import { Button, Paper, TextField, Typography } from "@mui/material";


async function agregarBien(bien: any) {
    const response = await my.ajax.insertar_bien(bien);
    return response;
}

//repetido, ver donde meter
type Bien = {
    ficha:string
    observacion:string
    integrado:string
    fecha:string
    serie:string
    espacio:string
    area:string
    responsable:string
    grupo:string
    detalle: string
    opciones:string
}

type AgregarBienProps = {
    onInsert: (bien: Bien) => void;
};

function AgregarBien({ onInsert }: AgregarBienProps) {
    const [formValues, setFormValues] = useState<Bien>({
        ficha: "",
        observacion: "",
        integrado: "",
        fecha: "",
        serie:"",
        espacio:"",
        area:"",
        responsable:"",
        grupo:"",
        detalle:"",
        opciones:"",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormValues({ ...formValues, [name]: value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await agregarBien(formValues);
        onInsert(formValues);
    };

    return (
        <Paper style={{ padding: 16 }}>
            <Typography variant="h6">Agregar Bien</Typography>
            <form onSubmit={handleSubmit}>
                <TextField
                    label="Ficha"
                    name="ficha"
                    value={formValues.ficha}
                    onChange={handleChange}
                    fullWidth
                    margin="normal"
                />
                <TextField
                    label="PRD"
                    name="prd"
                    fullWidth
                    margin="normal"
                />
                <TextField
                    label="Integrado"
                    name="integrado"
                    value={formValues.integrado}
                    onChange={handleChange}
                    fullWidth
                    margin="normal"
                />
                <TextField
                    label="Clasificación"
                    name="clasificacion"
                    fullWidth
                    margin="normal"
                />
                <TextField
                    label="Observación"
                    name="observacion"
                    value={formValues.observacion}
                    onChange={handleChange}
                    fullWidth
                    margin="normal"
                />
                <TextField
                    label="Fecha"
                    type="date"
                    name="fecha"
                    value={formValues.fecha}
                    onChange={handleChange}
                    fullWidth
                    margin="normal"
                    InputLabelProps={{
                        shrink: true,
                    }}
                />
                <Button type="submit" variant="contained" color="primary">
                    Agregar
                </Button>
            </form>
        </Paper>
    );
}

export default AgregarBien;
