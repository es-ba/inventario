var my = myOwn;

const baseUrl = "/inventario";

my.wScreens.prueba=async function(){
    history.replaceState(null, '', `${location.origin+location.pathname}/../react`);
    location.reload();
}