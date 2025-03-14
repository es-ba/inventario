import { useState, useEffect } from "react";
import * as React from "react";
import { TextField, Button, MenuItem, Box, FormControl, InputLabel, Select, SelectChangeEvent } from "@mui/material";

type FormularioBienProps = {
    bien: Bien;
    onSubmit: (bien: Bien) => void;
    isEditing?: boolean;
};

const ESTADO_OPTIONS = ['alta', 'baja'];
const CATEGORIA_OPTIONS = ['transferencia', 'etc'];
const MODALIDAD_USO_OPTIONS = ['trabajoremoto', 'prestamo'];

export default function FormularioBien({ bien: initialBien, onSubmit, isEditing = false }: FormularioBienProps) {
    const [bien, setBien] = useState<Bien>(initialBien);
    
    const [areas, setAreas] = useState<{id: string, area: string}[]>([]);
    const [responsables, setResponsables] = useState<{id: string, nombre: string}[]>([]);
    // @ts-ignore
    const [espacios, setEspacios] = useState<{id: string, nombre: string}[]>([]);
    // @ts-ignore
    const [sedes, setSedes] = useState<{id: string, nombre: string}[]>([]);
    const [grupos, setGrupos] = useState<{id: string, nombre: string}[]>([]);
    // @ts-ignore
    const [tiposBien, setTiposBien] = useState<{id: string, nombre: string}[]>([]);
    // @ts-ignore
    const [rubros, setRubros] = useState<{id: string, nombre: string}[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setBien(initialBien);
    }, [initialBien]);

    useEffect(() => {
        async function fetchForeignKeyData() {
            setLoading(true);
            try {
                const [areasData, responsablesData, espaciosData, sedesData, gruposData, tiposBienData, rubrosData] = await Promise.all([
                    my.ajax.table_data({ table: "areas" }),
                    my.ajax.table_data({ table: "responsables" }),
                    my.ajax.table_data({ table: "espacios" }),
                    my.ajax.table_data({ table: "sedes" }),
                    my.ajax.table_data({ table: "grupos" }),
                    my.ajax.table_data({ table: "tipo_bien" }),
                    my.ajax.table_data({ table: "rubros" })
                ]);
                
                setAreas(areasData);
                setResponsables(responsablesData);
                setEspacios(espaciosData);
                setSedes(sedesData);
                setGrupos(gruposData);
                setTiposBien(tiposBienData);
                setRubros(rubrosData);
            } catch (error) {
                console.error("Error fetching foreign key data:", error);
            } finally {
                setLoading(false);
            }
        }
        
        fetchForeignKeyData();
    }, []);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent
    ) => {
        const { name, value } = e.target;
        if (name) {
            setBien({ ...bien, [name]: value });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(bien);
    };

    if (loading) {
        return <div>Cargando formulario...</div>;
    }

    return (
        <form onSubmit={handleSubmit}>
            <Box sx={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 2, 
                '& .form-field': { 
                    flex: '1 0 calc(50% - 16px)', 
                    minWidth: '250px' 
                },
                '& .form-field-full': { 
                    flex: '1 0 100%' 
                }
            }}>
                <Box className="form-field">
                    <TextField
                        label="Ficha"
                        name="ficha"
                        value={bien.ficha || ''}
                        onChange={handleChange}
                        fullWidth
                        margin="normal"
                        disabled={isEditing}
                        required
                    />
                </Box>

                <Box className="form-field">
                    <TextField
                        label="Serie"
                        name="serie"
                        value={bien.serie || ''}
                        onChange={handleChange}
                        fullWidth
                        margin="normal"
                        required
                    />
                </Box>
                
                <Box className="form-field">
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Estado</InputLabel>
                        <Select
                            name="estado"
                            value={bien.estado || ''}
                            onChange={handleChange}
                            label="Estado"
                            required
                        >
                            {ESTADO_OPTIONS.map(option => (
                                <MenuItem key={option} value={option}>
                                    {option.charAt(0).toUpperCase() + option.slice(1)}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
                
                <Box className="form-field">
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Categoría</InputLabel>
                        <Select
                            name="categoria"
                            value={bien.categoria || ''}
                            onChange={handleChange}
                            label="Categoría"
                        >
                            {CATEGORIA_OPTIONS.map(option => (
                                <MenuItem key={option} value={option}>
                                    {option.charAt(0).toUpperCase() + option.slice(1)}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
                
                <Box className="form-field">
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Modalidad de Uso</InputLabel>
                        <Select
                            name="modalidaduso"
                            value={bien.modalidaduso || ''}
                            onChange={handleChange}
                            label="Modalidad de Uso"
                        >
                            {MODALIDAD_USO_OPTIONS.map(option => (
                                <MenuItem key={option} value={option}>
                                    {option === 'trabajoremoto' ? 'Trabajo Remoto' : 'Préstamo'}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
                
                <Box className="form-field">
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Área</InputLabel>
                        <Select
                            name="area"
                            value={bien.area || ''}
                            onChange={handleChange}
                            label="Área"
                        >
                            {areas.map(area => (
                                <MenuItem key={area.id} value={area.id}>
                                    {area.area}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
                
                <Box className="form-field">
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Responsable</InputLabel>
                        <Select
                            name="responsable"
                            value={bien.responsable || ''}
                            onChange={handleChange}
                            label="Responsable"
                        >
                            {responsables.map(resp => (
                                <MenuItem key={resp.id} value={resp.id}>
                                    {resp.nombre}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
                
                <Box className="form-field">
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Grupo</InputLabel>
                        <Select
                            name="grupo"
                            value={bien.grupo || ''}
                            onChange={handleChange}
                            label="Grupo"
                        >
                            {grupos.map(grupo => (
                                <MenuItem key={grupo.id} value={grupo.id}>
                                    {grupo.nombre}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>

                <Box className="form-field">
                    <TextField
                        label="Marca"
                        name="marca"
                        value={bien.marca || ''}
                        onChange={handleChange}
                        fullWidth
                        margin="normal"
                    />
                </Box>
                
                <Box className="form-field">
                    <TextField
                        label="Modelo"
                        name="modelo"
                        value={bien.modelo || ''}
                        onChange={handleChange}
                        fullWidth
                        margin="normal"
                    />
                </Box>

                <Box className="form-field">
                    <TextField
                        label="Fecha"
                        type="date"
                        name="fecha"
                        value={bien.fecha || ''}
                        onChange={handleChange}
                        fullWidth
                        margin="normal"
                        InputLabelProps={{
                            shrink: true
                        }}
                    />
                </Box>
                
                <Box className="form-field-full">
                    <TextField
                        label="Observación"
                        name="observacion"
                        value={bien.observacion || ''}
                        onChange={handleChange}
                        fullWidth
                        margin="normal"
                        multiline
                        rows={3}
                    />
                </Box>
                
                <Box className="form-field-full">
                    <TextField
                        label="Detalle"
                        name="detalle"
                        value={bien.detalle || ''}
                        onChange={handleChange}
                        fullWidth
                        margin="normal"
                    />
                </Box>
            </Box>
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button 
                    type="submit" 
                    variant="contained" 
                    color="primary" 
                    disabled={loading}
                >
                    {isEditing ? "Actualizar" : "Agregar"}
                </Button>
            </Box>
        </form>
    );
}
