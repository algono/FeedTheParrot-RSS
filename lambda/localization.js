const Alexa = require("ask-sdk-core");
const i18n = require("i18next");

const languageStrings = {
  en: {
    translation: {
      WELCOME_MSG:
        "Welcome, you can say Hello or Help. Which would you like to try?",
      HELLO_MSG: "Hello World!",
      HELP_MSG: "You can say hello to me! How can I help?",
      GOODBYE_MSG: "Goodbye!",
      REFLECTOR_MSG: "You just triggered {{intent}}",
      FALLBACK_MSG: "Sorry, I don't know about that. Please try again.",
      ERROR_MSG: "Sorry, I had trouble doing what you asked. Please try again.",
    },
  },
  es: {
    translation: {
      WELCOME_MSG:
        "Bienvenido, puedes decir Hola o Ayuda. ¿Cuál quieres probar?",
      HELLO_MSG: "¡Hola mundo!",
      HELP_MSG: "¡Puedes saludarme! ¿Cómo puedo ayudar?",
      GOODBYE_MSG: "¡Hasta pronto!",
      REFLECTOR_MSG: "Acabas de invocar el intent {{intent}}",
      FALLBACK_MSG: "Lo siento, no lo sé. Por favor, vuelva a intentarlo.",
      ERROR_MSG:
        "Lo siento, ha habido un error. Por favor, vuelva a intentarlo.",
    },
  },
};

const localizationRequestInterceptor = {
  process(handlerInput) {
    i18n
      .init({
        lng: Alexa.getLocale(handlerInput.requestEnvelope),
        resources: languageStrings,
      })
      .then((t) => {
        handlerInput.t = (...args) => t(...args);
      });
  },
};

module.exports = { localizationRequestInterceptor };
