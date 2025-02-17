import * as React from "react";
import { useState } from "react";
import { Button, Paper, TextField, Typography } from "@mui/material";

async function agregarBien(bien: any) {
    const response = await my.ajax.insertar_bien(bien);
    return response;
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
        <Paper className="form-container">
           <Typography variant="h6"><span className="mdi mdi-eye"></span>Detalle de bien</Typography>
            <form onSubmit={handleSubmit} className="form-row">
            <div className="form-group">
                <TextField className="form-field"
                    label="Ficha"
                    name="ficha"
                    value={formValues.ficha}
                    onChange={handleChange}
                    margin="normal"
                />
                <TextField className="form-field"
                    label="PRD"
                    name="prd"
                    fullWidth
                    margin="normal"
                />
                </div>
                <div className="form-group">
                <TextField className="form-field"
                    label="Responsable"
                    name="responsable"
                    fullWidth
                    margin="normal"
                />
                <TextField className="form-field"
                    label="En uso de"
                    name="en uso de"
                    fullWidth
                    margin="normal"
                />
                </div>
                
                <TextField className="form-field"
                    label="Area"
                    name="area"
                    value={formValues.observacion}
                    onChange={handleChange}
                    fullWidth
                    margin="normal"
                />
<div className="form-group">
                <TextField className="form-field"
                    label="Comodato"
                    name="comodato"
                    value={formValues.observacion}
                    onChange={handleChange}
                    fullWidth
                    margin="normal"
                />

                <TextField className="form-field"
                    label="Ubicacion"
                    name="ubicacion"
                    value={formValues.observacion}
                    onChange={handleChange}
                    fullWidth
                    margin="normal"
                />
</div>
<div className="form-group">
                <TextField className="form-field"
                    label="Estado"
                    name="estado"
                    value={formValues.observacion}
                    onChange={handleChange}
                    fullWidth
                    margin="normal"
                />
                    <TextField className="form-field"
                    label="Ultimo comodato adjunto"
                    name="ultimo comodato adjunto"
                    value={formValues.observacion}
                    onChange={handleChange}
                    fullWidth
                    margin="normal"
                />
                </div>

                    <TextField className="form-field"
                    label="Observaciones"
                    name="observaciones"
                    value={formValues.observacion}
                    onChange={handleChange}
                    fullWidth
                    margin="normal"
                />

                    <TextField className="form-field"
                    label="Detalle"
                    name="detalle"
                    value={formValues.observacion}
                    onChange={handleChange}
                    fullWidth
                    margin="normal"
                />


                <TextField className="form-field"
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
