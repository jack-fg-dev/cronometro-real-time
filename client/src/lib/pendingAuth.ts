// Estado temporal para pasar el password desde Home al handler de socket
// sin guardar en el store antes de confirmación del servidor
let _pendingPassword: string = '';

export const getPendingPassword = () => _pendingPassword;
export const setPendingPassword = (pw: string) => { _pendingPassword = pw; };
export const clearPendingPassword = () => { _pendingPassword = ''; };
