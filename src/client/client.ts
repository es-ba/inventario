import {html} from "js-to-html";

var my = myOwn;

// const baseUrl = "/inventario";

my.wScreens.prueba=async function(){
    // history.replaceState(null, '', `${location.origin+location.pathname}/../react`);
    // location.reload();
    let layout = document.getElementById('main_layout')!;
    layout.innerHTML = '';
    layout.appendChild(
    html.div({class:'prueba-screen'}, 'Pantalla de prueba del inventario').create()
    )
}


