import { getLocale, RequestInterceptor } from "ask-sdk-core";
import * as i18next from "i18next";

const languageStrings = {
  en: {
    translation: {
      WELCOME_MSG:
        "Welcome, you can ask me to read a feed and to list them. Which would you like to try?",
      FEED_LIST_MSG: "This is the list of feeds available: ",
      FEED_LIST_PROMPT_MSG: "What do you want me to do next?",
      NO_FEED_MSG: "Sorry, I don't know about that feed. Let's try again.",
      HELP_MSG: "You can ask me to read a feed and to list them. How can I help?",
      GOODBYE_MSG: "Goodbye!",
      REFLECTOR_MSG: "You just triggered {{intent}}",
      FALLBACK_MSG: "Sorry, I don't know about that. Please try again.",
      ERROR_MSG: "Sorry, I had trouble doing what you asked. Please try again.",
      NOT_IMPLEMENTED_MSG: "Sorry, this feature is yet to be implemented. Try again later.",
      AMPERSAND: "and",
      DEFAULT_VOICE: "Kendra",
      DEFAULT_VOICE_LOCALE: "en-US",
      READING_FEED: 'Ok. Now reading the feed "{{feed}}":',
      CONFIRMATION_CONTINUE_READING_FEED: 'Do you want me to continue reading?',
      END_READING_FEED: "And that's all there is at the moment.",
      SURPASSED_MAX_CHARACTERS: "Sorry, I am not able to continue reading. You can see the full text in the Alexa app.",
      FEED_NAME_FIELD: "name-en",
      AUTH_MSG: "The code is: ",
    }
  },
  es: {
    translation: {
      WELCOME_MSG:
        "Bienvenido, puedes pedirme que te lea una feed o que te diga la lista. ¿Cuál quieres probar?",
      FEED_LIST_MSG: "Esta es la lista de feeds disponibles: ",
      FEED_LIST_PROMPT_MSG: "¿Qué quieres que haga ahora?",
      NO_FEED_MSG: "Lo siento, no sé cuál es esa feed. Volvamos a intentarlo.",
      HELP_MSG: "Puedes pedirme que te lea una feed o que te diga la lista de feeds disponibles. ¿Cómo puedo ayudar?",
      GOODBYE_MSG: "¡Hasta pronto!",
      REFLECTOR_MSG: "Acabas de invocar el intent {{intent}}",
      FALLBACK_MSG: "Lo siento, no lo sé. Por favor, vuelva a intentarlo.",
      ERROR_MSG:
        "Lo siento, ha habido un error. Por favor, vuelva a intentarlo.",
      NOT_IMPLEMENTED_MSG: "Lo siento, esta función aún no ha sido implementada. Inténtalo de nuevo más tarde.",
      AMPERSAND: "y",
      DEFAULT_VOICE: "Enrique",
      DEFAULT_VOICE_LOCALE: "es-ES",
      READING_FEED: 'Vale. Leyendo la feed "{{feed}}":',
      CONFIRMATION_CONTINUE_READING_FEED: '¿Sigo leyendo?',
      END_READING_FEED: "Y eso es todo por ahora.",
      SURPASSED_MAX_CHARACTERS: "Lo siento, no puedo continuar leyendo. Puedes ver el texto completo en la app de Alexa.",
      FEED_NAME_FIELD: "name-es",
      AUTH_MSG: "El código es el siguiente: ",
    }
  },
};

export function init(locale: string) {
  return i18next.default.init({
    lng: locale,
    resources: languageStrings,
  });
}

export const localizationRequestInterceptor : RequestInterceptor = {
  process(handlerInput) {
    init(getLocale(handlerInput.requestEnvelope)).then((t) => {
      const attributes = handlerInput.attributesManager.getRequestAttributes();
      attributes.t = function (...args: any[]) {
        return (<any>t)(...args);
      }
    });
  },
};