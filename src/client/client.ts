var my = myOwn;

my.wScreens.prueba=async function(){
    history.replaceState(null, '', `${location.origin+location.pathname}/../react`);
    location.reload();
}