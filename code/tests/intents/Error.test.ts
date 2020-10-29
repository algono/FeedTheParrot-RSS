import { HandlerInput } from 'ask-sdk-core';
import fc from 'fast-check';
import { capture, instance, mock, spy, when } from 'ts-mockito';
import { GenericErrorHandler } from '../../src/intents/Error';
import { mockHandlerInput } from '../helpers/HandlerInputMocks';
import { testInAllLocales } from '../helpers/helperTests';

test('Generic error handler can handle anything', () => {
  // Returns true when passing null values
  expect(GenericErrorHandler.canHandle(null, null)).toBe(true);

  // Returns true when passing any values
  expect(
    GenericErrorHandler.canHandle(
      instance(mock<HandlerInput>()),
      instance(mock<Error>())
    )
  ).toBe(true);
});

test('Generic error handler shows error stack in console', async () => {
  await fc.assert(
    fc.asyncProperty(fc.string(), async (stack) => {
      const mockError = mock<Error>();
      when(mockError.stack).thenReturn(stack);

      const logSpy = spy(console);

      await GenericErrorHandler.handle(
        (await mockHandlerInput()).instanceHandlerInput,
        instance(mockError)
      );

      const [errorLog] = capture(logSpy.log).last();

      expect(errorLog).toContain(stack);
    })
  );
});

testInAllLocales('Generic error handler speaks error message', async (locale) => {
  const mocks = await mockHandlerInput({ locale });

  const mockError = mock<Error>();

  await GenericErrorHandler.handle(
    mocks.instanceHandlerInput,
    instance(mockError)
  );

  const [responseSpeakOutput] = capture(
    mocks.mockedResponseBuilder.speak
  ).last();

  expect(responseSpeakOutput).toEqual(mocks.t('ERROR_MSG'));
});
