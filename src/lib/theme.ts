// Se ejecuta antes de pintar; no contiene datos del usuario ni secretos.
export const themeScript = `(function(){try{var p=localStorage.getItem('dc-appearance');var d=p==='dark'||p!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.theme=d?'dark':'light'}catch(e){}})()`;
