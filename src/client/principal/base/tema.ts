import {createTheme} from '@mui/material/styles';

const AZUL_IDECBA = '#0b528a';
const CELESTE_IDECBA = '#249bd4';

export const temaInventario = createTheme({
    palette:{
        primary:{main:AZUL_IDECBA},
        secondary:{main:CELESTE_IDECBA, contrastText:'#fff'},
        text:{primary:'#1f2933', secondary:'#52606d'},
    },
    typography:{
        button:{textTransform:'none', fontWeight:600},
    },
    shape:{borderRadius:6},
    components:{
        MuiAppBar:{
            defaultProps:{elevation:0},
        },
        MuiButtonBase:{
            styleOverrides:{root:{textTransform:'none'}},
        },
        MuiTab:{
            styleOverrides:{root:{textTransform:'none', fontWeight:600}},
        },
        MuiTableCell:{
            styleOverrides:{head:{fontWeight:600}},
        },
    },
});
