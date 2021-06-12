import { instance } from 'ts-mockito';

/**
 * This is a workaround for issue #191 of ts-mockito (https://github.com/NagRock/ts-mockito/issues/191)
 *
 * Courtesy of GitHub user @jamesharv (https://github.com/jamesharv)
 *
 * Comment with this code: https://github.com/NagRock/ts-mockito/issues/191#issuecomment-708743761
 * 
 * (with small change from GitHub user @ThangHuuVu: https://github.com/NagRock/ts-mockito/issues/191#issuecomment-804694656)
 */
export const resolvableInstance = <T extends object>(mock: T): T =>
  new Proxy<T>(instance(mock), {
    get(target, prop, receiver) {
      if (
        ['Symbol(Symbol.toPrimitive)', 'then', 'catch'].includes(
          prop.toString()
        )
      ) {
        return undefined;
      }

      return Reflect.get(target, prop, receiver);
    },
  });
