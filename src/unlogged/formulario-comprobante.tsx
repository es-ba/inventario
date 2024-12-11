import * as React from "react";
import { useState } from "react";
import { Button, Paper, TextField, Typography } from "@mui/material";

async function agregarComprobante(comprobante: any) {
    const response = await my.ajax.insertar_comprobante(comprobante);
    return response;
}

type Comprobante = {
    ficha: string
    actaNum: string
    descripcion: string
    marca: string
    modelo: string
    serie: string
    imei: string
    opciones:string

}

type agregarComprobanteProps = {
    onInsert: (comprobante: Comprobante) => void;
};

function AgregarComprobante({ onInsert }: agregarComprobanteProps) {
    const [formValues, setFormValues] = useState<Comprobante>({
        ficha: "",
        actaNum: "",
        descripcion: "",
        marca: "",
        modelo:"",
        serie:"",
        imei:"",
        opciones:"",
        
        
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormValues({ ...formValues, [name]: value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await agregarComprobante(formValues);
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
                    label="Acta Nº"
                    name="actaNum"
                    value={formValues.actaNum}
                    onChange={handleChange}
                    fullWidth
                    margin="normal"
                />
                <TextField
                    label="Descripción"
                    name="descripcion"
                    value={formValues.descripcion}
                    onChange={handleChange}
                    fullWidth
                    margin="normal"
                />
                <TextField
                    label="Marca"
                    name="marca"
                    value={formValues.marca}
                    onChange={handleChange}
                    fullWidth
                    margin="normal"
                 
                />
                   <TextField
                    label="IMEI"
                    name="imei"
                    value={formValues.imei}
                    onChange={handleChange}
                    fullWidth
                    margin="normal"
                 
                />
                   <TextField
                    label="Modelo"
                    name="modelo"
                    value={formValues.modelo}
                    onChange={handleChange}
                    fullWidth
                    margin="normal"
                 
                />
                   <TextField
                    label="Serie"
                    name="serie"
                    value={formValues.serie}
                    onChange={handleChange}
                    fullWidth
                    margin="normal"
                 
                />
                   <TextField
                    label="Opciones"
                    name="opciones"
                    value={formValues.opciones}
                    onChange={handleChange}
                    fullWidth
                    margin="normal"
                 
                />
                <Button type="submit" variant="contained" color="primary">
                    Agregar
                </Button>
            </form>
        </Paper>
    );
}

export default AgregarComprobante;

