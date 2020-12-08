import { getLocale, RequestInterceptor } from 'ask-sdk-core';
import i18next, { i18n, TFunction } from 'i18next';
import Backend, { i18nextFsBackend } from 'i18next-fs-backend';
import { join } from 'path';

// Export this interface to abstract the localization library from the rest of the code
export { TFunction };

const backendOptions: i18nextFsBackend.i18nextFsBackendOptions = {
  // path where resources get loaded from, or a function
  // returning a path:
  // function (lngs, namespaces) { return customPath; }
  // the returned path will interpolate lng, ns if provided like giving a static path
  loadPath: join(__dirname, './locales/{{lng}}/{{ns}}.json'),
};

i18next.use(Backend);

function initInstance(instance: i18n, locale: string) {
  return instance.init({
    lng: locale,
    backend: backendOptions,
  });
}

export function init(locale: string) {
  return initInstance(i18next, locale);
}

export function initNewInstance(locale: string) {
  const newInstance = i18next.createInstance();

  newInstance.use(Backend);

  return initInstance(newInstance, locale);
}

export const LocalizationRequestInterceptor: RequestInterceptor = {
  async process(handlerInput) {
    const t = await init(getLocale(handlerInput.requestEnvelope));
    const attributes = handlerInput.attributesManager.getRequestAttributes();
    attributes.t = function (...args: any[]) {
      return (<any>t)(...args);
    };
  },
};
