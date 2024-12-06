import { mostrarPrincipal } from '../unlogged/inventario'

var my = myOwn;

// my.wScreens.prueba={
//     parameters:[],
//     autoproced:true,
//     mainAction:async (_params)=>{
//         alert('main action call')
//     }
// };

my.wScreens.prueba=async function(){
    // var mainLayout = document.getElementById('main_layout')!;
    mostrarPrincipal();

}


