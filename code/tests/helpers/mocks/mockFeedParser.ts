import { EventEmitter } from 'events';
import FeedParser from 'feedparser';
import fetch, { Response } from 'node-fetch';
import { mocked } from 'ts-jest/utils';
import { anyFunction, anyString, instance, mock, when } from 'ts-mockito';
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

  const intervals: { readable?: NodeJS.Timeout; end?: NodeJS.Timeout } = {};

  const setReadableInterval = () => {
    intervals.readable = setInterval(() => eventEmitter.emit('readable'), 10);
    return intervals;
  };

  when(feedParserMock.on('readable', anyFunction())).thenCall((ev, fn) =>
    eventEmitter.on(ev, async () => {
      clearInterval(intervals.readable);
      await fn();
      intervals.end = setInterval(() => eventEmitter.emit('end'), 10);
    })
  );

  when(feedParserMock.on('end', anyFunction())).thenCall((ev, fn) =>
    eventEmitter.on(ev, async () => {
      clearInterval(intervals.end);
      await fn();
    })
  );

  when(feedParserMock.on(anyString(), anyFunction())).thenCall(eventEmitter.on);

  mocked(FeedParser).mockImplementation(() => instance(feedParserMock));

  return {
    responseMock,
    responseBodyMock,
    feedParserMock,
    eventEmitter,
    intervals,
    setReadableInterval,
  };
}
