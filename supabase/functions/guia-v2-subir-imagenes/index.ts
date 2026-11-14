// Transferencia deshabilitada tras rechazo de revisión automática.
// No recibe imágenes ni accede a credenciales o a la base de datos.
Deno.serve(()=>new Response('Transferencia deshabilitada. Requiere autorización explícita del propietario para publicar las imágenes de campaña.',{status:410}));
