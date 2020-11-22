export class FeedIsTooLongError extends Error {
  constructor() {
    super();
    Object.setPrototypeOf(this, FeedIsTooLongError.prototype);
  }
}

export type InvalidFeedUrlErrorCode = 'invalid-url' | 'no-feed';

export class InvalidFeedUrlError extends Error {
  readonly code: InvalidFeedUrlErrorCode;

  constructor(code: InvalidFeedUrlErrorCode, message?: string) {
    super(message);
    Object.setPrototypeOf(this, InvalidFeedUrlError.prototype);

    this.code = code;
  }
}

export class NoUserDataError extends Error {
  constructor() {
    super();
    Object.setPrototypeOf(this, NoUserDataError.prototype);
  }
}
