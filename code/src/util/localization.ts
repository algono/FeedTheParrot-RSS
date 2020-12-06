import { getLocale, RequestInterceptor } from 'ask-sdk-core';
import i18next, { TFunction } from 'i18next';

import * as en from './localization/locale-en.json';
import * as es from './localization/locale-es.json';

// Export this interface to abstract the localization library from the rest of the code
export { TFunction };

export const languageStrings = {
  en,
  es,
};

export function init(locale: string) {
  return i18next.init({
    lng: locale,
    resources: languageStrings,
  });
}

export function initNewInstance(locale: string) {
  return i18next
    .createInstance({
      lng: locale,
      resources: languageStrings,
    })
    .init();
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
