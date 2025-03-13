import * as React from "react";
import { Routes, Route } from 'react-router-dom';
import BienesPage from "./pages/bienes-page";
import EditarBienPage from "./pages/editar-bien-page";

export function AppRoutes() {
    const baseUrl = "/inventario";

    return (
    <Routes>
        <Route path={`${baseUrl}/react`} element={<BienesPage />} />
        <Route path={`${baseUrl}/react/bien/add`} element={<EditarBienPage />} />
        <Route path={`${baseUrl}/react/bien/edit/:ficha`} element={<EditarBienPage />} />
    </Routes>
    );
}
