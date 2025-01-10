import * as React from "react";
import { Routes, Route } from 'react-router-dom';
import BienesPage from "./pages/bienes-page";

export function AppRoutes() {
    const baseUrl = "/inventario";

    return (
    <Routes>
        <Route path={`${baseUrl}/react`} element={<BienesPage />} />
    </Routes>
    );
}
