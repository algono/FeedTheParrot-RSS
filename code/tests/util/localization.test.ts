import { localizationRequestInterceptor } from '../../src/util/localization';
import { mockHandlerInput } from '../helpers/HandlerInputMocks';
import { testInAllLocales } from '../helpers/helperTests';

jest.mock('ask-sdk-core');

import { getLocale } from 'ask-sdk-core';
import { mocked } from 'ts-jest/utils';

jest.mock('i18next');

import i18next, { TFunction } from 'i18next';

testInAllLocales('Localization Request Interceptor works', async (locale) => {
  const requestAttributes: { t?: TFunction } = {};
  const mocks = await mockHandlerInput({
    locale,
    requestAttributes,
    addTFunctionToRequestAttributes: false,
  });

  mocked(getLocale).mockReturnValue(locale);

  const tMocked = jest.fn();

  mocked(i18next.init).mockResolvedValue(() => tMocked());

  await localizationRequestInterceptor.process(mocks.instanceHandlerInput);

  expect(tMocked).toBeCalledTimes(0);

  requestAttributes.t('');

  expect(tMocked).toBeCalled();
});
