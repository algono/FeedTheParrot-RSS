import { instance } from 'ts-mockito';

/**
 * This is a workaround for issue #191 of ts-mockito (https://github.com/NagRock/ts-mockito/issues/191)
 *
 * Courtesy of GitHub user @jamesharv (https://github.com/jamesharv)
 *
 * Comment with this code: https://github.com/NagRock/ts-mockito/issues/191#issuecomment-708743761
 */
export const resolvableInstance = <T extends {}>(mock: T) =>
  new Proxy<T>(instance(mock), {
    get(target, name: PropertyKey) {
      if (
        ['Symbol(Symbol.toPrimitive)', 'then', 'catch'].includes(
          name.toString()
        )
      ) {
        return undefined;
      }

      return (target as any)[name];
    },
  });
