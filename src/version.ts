import pkg from '../package.json'

/** Versión única de la app: se muestra en el login y en el perfil.
 *  Se actualiza en package.json con cada push (bump manual antes del commit). */
export const APP_VERSION = pkg.version
