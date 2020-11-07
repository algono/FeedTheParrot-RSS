export function hasReturned<T>(
  result: jest.MockResult<T>
): result is jest.MockResultReturn<T> {
  return result.type == 'return';
}

export function isIncomplete<T>(
  result: jest.MockResult<T>
): result is jest.MockResultIncomplete {
  return result.type == 'incomplete';
}

export function hasThrown<T>(
  result: jest.MockResult<T>
): result is jest.MockResultThrow {
  return result.type == 'throw';
}
