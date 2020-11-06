import { CustomSkillBuilder, SkillBuilders } from 'ask-sdk-core';
import { mocked } from 'ts-jest/utils';
import { anyString, instance, mock, verify, when } from 'ts-mockito';
import { GenericErrorHandler } from '../src/intents/Error';
import { ReadItemIntentHandler } from '../src/intents/Read/Item';
import { IntentReflectorHandler } from '../src/intents/Reflector';
import {
  RepeatIntentHandler,
  SaveResponseForRepeatingInterceptor,
} from '../src/intents/Repeat';
import { LocalizationRequestInterceptor } from '../src/util/localization';
import { lastCallTo } from './helpers/jest/jestMockInstanceHelpers';

jest.mock('ask-sdk-core');

const customSkillBuilderMock = mock<CustomSkillBuilder>();

const customSkillBuilder = instance(customSkillBuilderMock);

/**
 * ts-mockito's 'when' function does not work with functions having the spread operator
 * This is because the library checks that it matches a specific number of arguments
 * So spying the functions with jest seems to be the best alternative, as the spy works with any number (and/or type) of arguments
 */
const addRequestHandlersSpy = jest
  .spyOn(customSkillBuilder, 'addRequestHandlers')
  .mockReturnThis();

when(customSkillBuilderMock.withSkillId(anyString())).thenCall(() =>
  instance(customSkillBuilderMock)
);

const addErrorHandlersSpy = jest
  .spyOn(customSkillBuilder, 'addErrorHandlers')
  .mockReturnThis();

const addRequestInterceptorsSpy = jest
  .spyOn(customSkillBuilder, 'addRequestInterceptors')
  .mockReturnThis();

const addResponseInterceptorsSpy = jest
  .spyOn(customSkillBuilder, 'addResponseInterceptors')
  .mockReturnThis();

when(customSkillBuilderMock.lambda()).thenReturn(null);

mocked(SkillBuilders).custom.mockImplementation(() =>
  instance(customSkillBuilderMock)
);

// We do all this before the tests run because we can only import the index (thus creating the lambda handler) once
// (also we don't really need it to run multiple times, because there are no other conditions or branches)
jest.requireActual('../src/index');

test('Custom skill specifies its skill id', () => {
  verify(customSkillBuilderMock.withSkillId(anyString())).once();
});

test('Custom skill has at least one request handler and a generic error handler', () => {
  expect(addRequestHandlersSpy).toHaveBeenCalled();
  expect(lastCallTo(addRequestHandlersSpy).length).toBeGreaterThan(0);

  expect(addErrorHandlersSpy).toHaveBeenCalled();
  expect(lastCallTo(addErrorHandlersSpy)).toContain(GenericErrorHandler);
});

test('Custom skill has LocalizationRequestInterceptor', () => {
  expect(addRequestInterceptorsSpy).toHaveBeenCalled();
  expect(lastCallTo(addRequestInterceptorsSpy)).toContain(
    LocalizationRequestInterceptor
  );
});

test('Custom skill has SaveResponseForRepeatingInterceptor', () => {
  expect(addResponseInterceptorsSpy).toHaveBeenCalled();
  expect(lastCallTo(addResponseInterceptorsSpy)).toContain(
    SaveResponseForRepeatingInterceptor
  );
});

test("RepeatIntentHandler is after ReadItemIntentHandler so it doesn't override its repeating functionality", () => {
  const lastCallArgs = lastCallTo(addRequestHandlersSpy);

  expect(lastCallArgs.length).toBeGreaterThan(0);

  const repeatIntentHandlerPosition = lastCallArgs.indexOf(RepeatIntentHandler);
  const readItemIntentHandlerPosition = lastCallArgs.indexOf(
    ReadItemIntentHandler
  );

  expect(repeatIntentHandlerPosition).toBeGreaterThanOrEqual(0);
  expect(readItemIntentHandlerPosition).toBeGreaterThanOrEqual(0);

  expect(repeatIntentHandlerPosition).toBeGreaterThan(
    readItemIntentHandlerPosition
  );
});

test("IntentReflectorHandler is last so it doesn't override our custom intent handlers", () => {
  const lastCallArgs = lastCallTo(addRequestHandlersSpy);

  expect(lastCallArgs.length).toBeGreaterThan(0);

  const position = lastCallArgs.indexOf(IntentReflectorHandler);

  expect(position).toBeGreaterThanOrEqual(0);
  expect(position).toEqual(lastCallArgs.length - 1);
});
