// Minimal, strongly-typed decorators for RPC and multicast.
// They store metadata so NetBus can register inbound handlers and call the *original* functions.

import type { NetBus } from './net-bus';

/** Internal metadata model attached to constructors. */
type MethodKind = 'RunOnServer' | 'Multicast';

interface MethodMeta {
  kind: MethodKind;
  name: string;
  /** Original, undecorated function so NetBus can call without re-sending. */
  original: Function;
}

interface ConstructorWithMeta {
  [META_KEY]?: MethodMeta[];
}

interface NetBusEntity {
  _netBus?: NetBus;
  __netKey: string;
  netAddress: string;
}

const META_KEY = Symbol('net:methodMeta');

function getMetaArray(ctor: ConstructorWithMeta): MethodMeta[] {
  // Inherit metadata up the prototype chain (so base class methods work)
  const existing: MethodMeta[] = ctor[META_KEY] ?? [];
  ctor[META_KEY] = existing;
  return existing;
}

/** Utility for NetBus to read all decorated methods (including prototypes). */
export function collectMethodMeta(instance: object): MethodMeta[] {
  const metas: MethodMeta[] = [];
  let proto = Object.getPrototypeOf(instance);
  // Walk until Object.prototype, collecting at each level.
  while (proto && proto !== Object.prototype) {
    const arr: MethodMeta[] = (proto.constructor as ConstructorWithMeta)[META_KEY] ?? [];
    metas.push(...arr);
    proto = Object.getPrototypeOf(proto);
  }
  // Remove duplicates by (kind+name) keeping closest implementation
  const seen = new Set<string>();
  const out: MethodMeta[] = [];
  for (const m of metas.reverse()) {
    const key = `${m.kind}:${m.name}`;
    if (!seen.has(key)) { seen.add(key); out.push(m); }
  }
  return out.reverse();
}

/**
 * @RunOnServer — if host, invoke locally. If client, send RPC to host.
 * Return value is ignored (fire-and-forget). For request/response, build a command API on top.
 */
export function RunOnServer() {
  return function (target: object, key: string, desc: PropertyDescriptor) {
    const original = desc.value as Function;

    // Register metadata on the constructor
    const metaArr = getMetaArray((target as { constructor: ConstructorWithMeta }).constructor);
    metaArr.push({ kind: 'RunOnServer', name: key, original });

    // Replace method: dispatch via NetBus unless host
    desc.value = function (this: NetBusEntity, ...args: unknown[]) {
      const bus: NetBus | undefined = this._netBus;
      if (!bus) return original.apply(this, args);
      
    //   const methodName = `${this.__netKey}.${key}`;
      
      if (bus.isHost) {
        // console.log(`[RPC_IN host] ${methodName}(${JSON.stringify(args)})`);
        return original.apply(this, args);
      } else {
        // console.log(`[RPC_OUT -> host] ${methodName}(${JSON.stringify(args)})`);
        bus.sendRpcToHost(this.__netKey, key, args);
      }
    };

    return desc;
  };
}

/**
 * @Multicast — broadcast method call to all peers (including sender).
 * When *called* locally, it only sends; the actual method body runs on inbound delivery.
 */
export function Multicast() {
  return function (target: object, key: string, desc: PropertyDescriptor) {
    const original = desc.value as Function;

    // Register metadata on the constructor
    const metaArr = getMetaArray((target as { constructor: ConstructorWithMeta }).constructor);
    metaArr.push({ kind: 'Multicast', name: key, original });

    // Replace method: send multicast; inbound path calls original via NetBus.
    desc.value = function (this: NetBusEntity, ...args: unknown[]) {
      const bus: NetBus | undefined = this._netBus;
      if (!bus) return original.apply(this, args); // offline/SP
      
      // Send multicast to other peers
      bus.sendMulticast(this.netAddress, key, args);
      
      // Execute locally as well (since NetBus doesn't do self-loopback)
      return original.apply(this, args);
    };

    return desc;
  };
}
