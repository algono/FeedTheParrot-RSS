import { RequestHandler, getRequestType, getIntentName } from 'ask-sdk-core';

import { randomBytes } from 'crypto';
import { Database } from '../database/Database';

import {
  AUTH_CODE_LENGTH,
  AUTH_CODE_TIME_TO_EXPIRE,
  LONG_PAUSE,
} from '../util/constants';
import { TFunction } from '../util/localization';

export const AuthIntentHandler: RequestHandler = {
  canHandle(handlerInput) {
    return (
      getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      getIntentName(handlerInput.requestEnvelope) === 'AuthIntent'
    );
  },
  async handle(handlerInput) {
    const { attributesManager } = handlerInput;

    const {
      t,
    }: {
      t?: TFunction;
    } = attributesManager.getRequestAttributes();

    const code = generateSixDigitCode();

    console.log('(AuthIntent) Generated code: ' + JSON.stringify(code));

    await Database.use(attributesManager).setAuthCode({
      code,
      expirationDate: new Date(Date.now() + AUTH_CODE_TIME_TO_EXPIRE),
    });

    const speakOutput: string = `${t('AUTH_PRE_CODE_MSG')} ${code
      .split('')
      .join(LONG_PAUSE)}. ${t('AUTH_EXPLANATION_MSG')} ${t('REPROMPT_MSG')}`;

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  },
};

function generateSixDigitCode() {
  return (parseInt(randomBytes(4).toString('hex'), 16) % 10 ** AUTH_CODE_LENGTH)
    .toString()
    .padStart(AUTH_CODE_LENGTH, '0');
}
