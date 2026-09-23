ALTER TABLE bienes DISABLE TRIGGER bienes_auditar_trg_after;
UPDATE bienes SET estado = bien_estado_calcular(ficha, activo, estado_baja);
ALTER TABLE bienes ENABLE TRIGGER bienes_auditar_trg_after;
