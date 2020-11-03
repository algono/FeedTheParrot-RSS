import {
  init,
  initNewInstance,
  LocalizationRequestInterceptor,
  TFunction,
} from '../../src/util/localization';
import { mockHandlerInput } from '../helpers/mocks/HandlerInputMocks';
import { testInAllLocales } from '../helpers/helperTests';

jest.mock('ask-sdk-core');

import { getLocale } from 'ask-sdk-core';
import { mocked } from 'ts-jest/utils';

jest.mock('i18next');

import i18next from 'i18next';

function mockTFunction(locale: string) {
  mocked(getLocale).mockReturnValue(locale);

  const tMocked = jest.fn();

  mocked(i18next.createInstance).mockReturnThis();
  mocked(i18next.init).mockResolvedValue(() => tMocked());

  return tMocked;
}

function checkTFunctionFromInit(init: (locale: string) => Promise<TFunction>) {
  return async (locale: string) => {
    const tMocked = mockTFunction(locale);

    const t = await init(locale);

    expect(tMocked).toBeCalledTimes(0);

    t('');

    expect(tMocked).toBeCalled();
  };
}

testInAllLocales('init works', checkTFunctionFromInit(init));
testInAllLocales(
  'initNewInstance works',
  checkTFunctionFromInit(initNewInstance)
);

testInAllLocales('Localization Request Interceptor works', async (locale) => {
  const requestAttributes: { t?: TFunction } = {};
  const mocks = await mockHandlerInput({
    locale,
    requestAttributes,
    addTFunctionToRequestAttributes: false,
  });

  const tMocked = mockTFunction(locale);

  await LocalizationRequestInterceptor.process(mocks.instanceHandlerInput);

  expect(tMocked).toBeCalledTimes(0);

  requestAttributes.t('');

  expect(tMocked).toBeCalled();
});
