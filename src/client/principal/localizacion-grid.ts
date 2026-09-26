import {esES} from '@mui/x-data-grid/locales';

export function gridLocaleText(noRowsLabel:string){
    return {
        ...esES.components.MuiDataGrid.defaultProps.localeText,
        noRowsLabel,
        toolbarQuickFilterPlaceholder:'Buscar en resultados…',
    };
}

export const bienesGridLocaleText = gridLocaleText('No se encontraron bienes');
