import * as React from "react";
import { Paper, Typography, TextField, } from "@mui/material";

type DetalleBienProps = {
    bien: Bien;
};

function DetalleBien({ bien }: DetalleBienProps) {
    console.log(bien);
    return (
        <Paper className="form-modal-container">
            <Typography sx={{ marginBottom: '30px',}} variant="h6"><span className="mdi mdi-eye"></span>Detalle del bien</Typography>
            <div className="form-row">
                <div className="form-group">
                <TextField label="Ficha" value={bien.ficha} variant="outlined" fullWidth margin="dense"/>
                    {/*<Typography variant="body1"><strong>Serie:</strong> {bien.serie}</Typography>*/}
                </div>
                <div className="form-group">
                <TextField label="Responsable" value={bien.responsable} variant="outlined" fullWidth margin="dense"/>
                <TextField label="En uso de" value={bien.enusode} variant="outlined" fullWidth margin="dense"/>
                </div>
                <div className="form-group">
                <TextField label="Área" value={bien.area} variant="outlined" fullWidth margin="dense"/>
                </div>
                <div className="form-group">
                    {/* //no va Estado segun maqueta//
                    // <Typography variant="body1"><strong>Espacio:</strong> {bien.espacio}</Typography> */}
                    <TextField label="Comodato" variant="outlined" fullWidth margin="dense"/>
                    <TextField label="Ubicación:" value={bien.ubicacion} variant="outlined" fullWidth margin="dense"/>
                </div>
                <div className="form-group">
                <TextField label="Estado" value={bien.estado} variant="outlined" fullWidth margin="dense"/>
                <TextField label="Último comodato firmado"variant="outlined" fullWidth margin="dense"/>
                </div>
                {/* //no va grupo segun maqueta//
                <div className="form-group">
                <Typography variant="body1"><strong>Grupo:</strong> {bien.grupo}</Typography>
                </div>*/}
                <div className="form-group">
                    <Typography variant="body1"><strong>Detalle:</strong> {bien.detalle}</Typography>
                </div>
                <div className="form-group">
                    <Typography variant="body1"><strong>Observación:</strong> {bien.observacion}</Typography>
                    {/* <Typography variant="body1"><strong>Fecha:</strong> {bien.fecha}</Typography> */}
                </div>
            </div>
        </Paper>
    );
}

export default DetalleBien;
