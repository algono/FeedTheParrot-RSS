import { getLocale, RequestInterceptor } from 'ask-sdk-core';
import i18next, { TFunction } from 'i18next';

// Export this interface to abstract the localization library from the rest of the code
export { TFunction };

export const languageStrings = {
  en: {
    translation: {
      WELCOME_MSG:
        'Welcome, you can ask me to read a feed and to list them. Which would you like to try?',
      FEED_LIST_MSG: 'This is the list of available feeds: ',
      FEED_LIST_EMPTY_MSG:
        'There are no available feeds. Add one using the feed the parrot app.',
      REPROMPT_MSG: 'What do you want me to do next?',
      NO_FEED_MSG: "Sorry, I don't know about that feed. Let's try again.",
      HELP_MSG:
        'You can ask me to read a feed and to list them. How can I help?',
      GOODBYE_MSG: 'Goodbye!',
      REFLECTOR_MSG: 'You just triggered {{intent}}',
      FALLBACK_MSG: "Sorry, I don't know about that. Please try again.",
      ERROR_MSG: 'Sorry, I had trouble doing what you asked. Please try again.',
      FEED_TOO_LONG_ERROR_MSG:
        "Sorry, the feed is too long; I haven't been able to process it. Please, set an item limit for the feed in the Feed the Parrot app to make it shorter.",
      NOT_IMPLEMENTED_MSG:
        'Sorry, this feature is yet to be implemented. Try again later.',
      AMPERSAND: 'and',
      DEFAULT_VOICE: 'Kendra',
      DEFAULT_VOICE_LOCALE: 'en-US',
      READING_FEED: 'Ok. Now reading the feed "{{feed}}":',
      CONFIRMATION_CONTINUE_READING_FEED: 'Do you want me to continue reading?',
      CONFIRMATION_GOTO_NEXT_FEED_ITEM: 'Shall I go to the next one?',
      END_READING_FEED: "And that's all there is at the moment.",
      FEED_NAME_FIELD: 'name-en',
      AUTH_PRE_CODE_MSG: 'The code is:',
      AUTH_EXPLANATION_MSG:
        'Use this code in the feed the parrot app to login.',
    },
  },
  es: {
    translation: {
      WELCOME_MSG:
        'Bienvenido, puedes pedirme que te lea una feed o que te diga la lista. ¿Cuál quieres probar?',
      FEED_LIST_MSG: 'Esta es la lista de feeds disponibles: ',
      FEED_LIST_EMPTY_MSG:
        'No hay ninguna feed disponible. Añade una a través de la app de al loro.',
      REPROMPT_MSG: '¿Qué quieres que haga ahora?',
      NO_FEED_MSG: 'Lo siento, no sé cuál es esa feed. Volvamos a intentarlo.',
      HELP_MSG:
        'Puedes pedirme que te lea una feed o que te diga la lista de feeds disponibles. ¿Cómo puedo ayudar?',
      GOODBYE_MSG: '¡Hasta pronto!',
      REFLECTOR_MSG: 'Acabas de invocar el intent {{intent}}',
      FALLBACK_MSG: 'Lo siento, no lo sé. Por favor, vuelva a intentarlo.',
      ERROR_MSG:
        'Lo siento, ha habido un error. Por favor, vuelva a intentarlo.',
      FEED_TOO_LONG_ERROR_MSG:
        'Lo siento, la feed es demasiado larga; no he podido procesarla. Por favor, indica un límite de elementos para la feed en la app de al loro para acortarla.',
      NOT_IMPLEMENTED_MSG:
        'Lo siento, esta función aún no ha sido implementada. Inténtalo de nuevo más tarde.',
      AMPERSAND: 'y',
      DEFAULT_VOICE: 'Enrique',
      DEFAULT_VOICE_LOCALE: 'es-ES',
      READING_FEED: 'Vale. Leyendo la feed "{{feed}}":',
      CONFIRMATION_CONTINUE_READING_FEED: '¿Sigo leyendo?',
      CONFIRMATION_GOTO_NEXT_FEED_ITEM: '¿Paso al siguiente?',
      END_READING_FEED: 'Y eso es todo por ahora.',
      FEED_NAME_FIELD: 'name-es',
      AUTH_PRE_CODE_MSG: 'El código es el siguiente:',
      AUTH_EXPLANATION_MSG:
        'Utiliza este código en la app de al loro para iniciar sesión.',
    },
  },
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
