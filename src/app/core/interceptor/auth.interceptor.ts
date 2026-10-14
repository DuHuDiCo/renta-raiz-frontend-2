import { HTTP_INTERCEPTORS, HttpInterceptorFn } from '@angular/common/http';
// Solo el núcleo y AES (CBC y Pkcs7 vienen con AES): importar 'crypto-js' entero trae todos los algoritmos.
import CryptoJS from 'crypto-js/core';
import 'crypto-js/aes';
import { Login, token } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {

  const encryptedToken = CryptoJS.AES.encrypt(
    token,
    CryptoJS.enc.Utf8.parse(Login.tokenEncrypt),
    {
      iv: CryptoJS.enc.Utf8.parse(Login.ivEncrypted),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }
  ).toString();
  req = req.clone({
    setHeaders: {
      Authorization: `Bearer ${encryptedToken}`
    }
  });
  return next(req);
};

export const authInterceptorProviders = [
  {
    provide: HTTP_INTERCEPTORS,
    useClass: authInterceptor,
    multi: true
  }
]
