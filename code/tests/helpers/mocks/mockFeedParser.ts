import { EventEmitter } from 'events';
import FeedParser from 'feedparser';
import fetch, { Response } from 'node-fetch';
import { mocked } from 'ts-jest/utils';
import { anyFunction, instance, mock, when } from 'ts-mockito';
import { resolvableInstance } from '../ts-mockito/resolvableInstance';

export function mockNodeFetch({ statusCode = 200 } = {}) {
  const responseMock = mock<Response>();

  when(responseMock.ok).thenReturn(statusCode >= 200 && statusCode < 300);
  when(responseMock.status).thenReturn(statusCode);

  const responseBodyMock = mock<NodeJS.ReadableStream>();

  when(responseMock.body).thenCall(() => instance(responseBodyMock));

  mocked(fetch).mockImplementation(() =>
    Promise.resolve(resolvableInstance(responseMock))
  );
  return { responseMock, responseBodyMock };
}

export function mockNodeFetchRejects(reason: any) {
  mocked(fetch).mockRejectedValue(reason);
}

export type FeedParserEventIntervals = {
  readable?: NodeJS.Timeout;
  end?: NodeJS.Timeout;
  [key: string]: NodeJS.Timeout;
};

export type FeedParserEvents = 'readable' | 'end';

/**
 * This function needs 'feedparser' and 'node-fetch' libraries to have been mocked before
 * @example
 * // You must ALWAYS mock the modules first
 * // (order does not matter)
 * jest.mock('feedparser');
 * jest.mock('node-fetch');
 * // ...
 * mockFeedParser();
 *
 * Remember to also clear all intervals before ending the tests to avoid leaking
 * @example
 * const { intervals } = mockFeedParser();
 * // ...
 * afterAll(() => {
 *   for (const key in intervals) {
 *     clearInterval(intervals[key]);
 *   }
 * });
 */
export function mockFeedParser() {
  const { responseMock, responseBodyMock } = mockNodeFetch();

  const feedParserMock = mock<FeedParser>();

  const eventEmitter = new EventEmitter();

  const intervals: FeedParserEventIntervals = {};

  function setEventInterval(event: FeedParserEvents) {
    intervals[event] = setInterval(() => eventEmitter.emit(event), 0);
  }

  function setErrorEventInterval(expectedError: Error) {
    intervals.error = setInterval(() => {
      if (eventEmitter.listeners('error').length > 0)
        eventEmitter.emit('error', expectedError);
    }, 0);
  }

  function callEventHandler(handler: () => any, args?: any[]) {
    return handler.bind(instance(feedParserMock), ...args)();
  }

  when(feedParserMock.on('readable', anyFunction())).thenCall((ev, fn) =>
    eventEmitter.once(ev, async (...args) => {
      clearInterval(intervals.readable);
      await callEventHandler(fn, args);
      intervals.end = setInterval(() => eventEmitter.emit('end'), 0);
    })
  );

  when(feedParserMock.on('end', anyFunction())).thenCall((ev, fn) =>
    eventEmitter.once(ev, async (...args) => {
      clearInterval(intervals.end);
      await callEventHandler(fn, args);
    })
  );

  when(feedParserMock.on('error', anyFunction())).thenCall((ev, fn) =>
    eventEmitter.once(ev, (...args) => callEventHandler(fn, args))
  );

  mocked(FeedParser).mockImplementation(() => instance(feedParserMock));

  return {
    responseMock,
    responseBodyMock,
    feedParserMock,
    eventEmitter,
    intervals,
    setEventInterval,
    setErrorEventInterval,
  };
}
