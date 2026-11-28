/* Configuración de Firebase del proyecto elpatron-b8c32.
   Estos datos son públicos por diseño (van en el navegador); la seguridad
   la ponen las reglas de Firestore. Cada versión del juego (clasica, v1, v2, v3)
   define EP_VERSION para tener sus propios 3 slots. */
window.EP_FIREBASE = {
    apiKey: 'AIzaSyDZIN5blk0mzsPq8ziFRYaJEMRYn3NZthA',
    authDomain: 'elpatron-b8c32.firebaseapp.com',
    projectId: 'elpatron-b8c32',
    storageBucket: 'elpatron-b8c32.firebasestorage.app',
    messagingSenderId: '843962069965',
    appId: '1:843962069965:web:59e9dff92b2ee226b48a84'
};
window.EP_VERSION = window.EP_VERSION || 'clasica';
