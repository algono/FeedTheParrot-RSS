import { MethodStub } from "ts-mockito/lib/stub/MethodStub";
import { ReturnValueMethodStub } from "ts-mockito/lib/stub/ReturnValueMethodStub";
import { Mocker } from "ts-mockito/lib/Mock";

export class FunctionalMocker extends Mocker {
  protected override getEmptyMethodStub() : MethodStub {
    return new ReturnValueMethodStub(-1, [], this.instance);
  }
}
/**
 * Create a functional mock.
 * This means that by default all methods will return the mock instance itself, allowing for chained calls.
 */
export function fmock<T>(clazz?: any): T {
  return new FunctionalMocker(clazz).getMock();
}
