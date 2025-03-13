import * as React from "react";
import { Paper, Typography } from "@mui/material";

type DetalleBienProps = {
    bien: Bien;
};

function DetalleBien({ bien }: DetalleBienProps) {
    console.log(bien);
    return (
        <Paper className="form-container">
            <Typography variant="h6"><span className="mdi mdi-eye"></span>Detalle de bien</Typography>
            <div className="form-row">
                <div className="form-group">
                    <Typography variant="body1"><strong>Ficha:</strong> {bien.ficha}</Typography>
                    <Typography variant="body1"><strong>Serie:</strong> {bien.serie}</Typography>
                </div>
                <div className="form-group">
                    <Typography variant="body1"><strong>Responsable:</strong> {bien.responsable}</Typography>
                    <Typography variant="body1"><strong>Área:</strong> {bien.area}</Typography>
                </div>
                <div className="form-group">
                    <Typography variant="body1"><strong>Espacio:</strong> {bien.espacio}</Typography>
                    <Typography variant="body1"><strong>Grupo:</strong> {bien.grupo}</Typography>
                </div>
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
