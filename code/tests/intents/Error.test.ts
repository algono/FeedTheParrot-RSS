import { HandlerInput } from 'ask-sdk-core';
import fc from 'fast-check';
import { capture, instance, mock, spy, when } from 'ts-mockito';
import {
  FeedIsTooLongError,
  FeedIsTooLongErrorHandler,
  GenericErrorHandler,
} from '../../src/intents/Error';
import { mockHandlerInput } from '../helpers/mocks/HandlerInputMocks';
import { testInAllLocales } from '../helpers/helperTests';

describe('Feed is too long error handler', () => {
  test('can handle only FeedIsToLongErrors', () => {
    const handlerInputMock = mock<HandlerInput>();

    // Returns true when passing FeedIsTooLongError
    expect(
      FeedIsTooLongErrorHandler.canHandle(
        instance(handlerInputMock),
        new FeedIsTooLongError()
      )
    ).toBe(true);

    // Returns true when passing any error
    expect(
      FeedIsTooLongErrorHandler.canHandle(
        instance(handlerInputMock),
        instance(new Error())
      )
    ).toBe(false);
  });

  testInAllLocales('speaks error message')(async (locale) => {
    const mocks = await mockHandlerInput({ locale });

    const errorMock = mock<FeedIsTooLongError>();

    await FeedIsTooLongErrorHandler.handle(
      mocks.instanceHandlerInput,
      instance(errorMock)
    );

    const [responseSpeakOutput] = capture(
      mocks.mockedResponseBuilder.speak
    ).last();

    expect(responseSpeakOutput).toContain(mocks.t('FEED_TOO_LONG_ERROR_MSG'));
  });
});

describe('Generic error handler', () => {
  test('can handle anything', () => {
    // Returns true when passing null values
    expect(GenericErrorHandler.canHandle(null, null)).toBe(true);

    // Returns true when passing any values
    expect(
      GenericErrorHandler.canHandle(
        instance(mock<HandlerInput>()),
        instance(new Error())
      )
    ).toBe(true);
  });

  test('shows error stack in console', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (stack) => {
        const mockError = mock<Error>();
        when(mockError.stack).thenReturn(stack);

        const logSpy = spy(console);

        await GenericErrorHandler.handle(
          (await mockHandlerInput({ locale: null })).instanceHandlerInput,
          instance(mockError)
        );

        const [errorLog] = capture(logSpy.log).last();

        expect(errorLog).toContain(stack);
      })
    );
  });

  testInAllLocales('speaks error message')(
    async (locale) => {
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
    }
  );
});
