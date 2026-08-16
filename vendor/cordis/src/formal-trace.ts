import type { Context } from './context.ts'
import type { Disposable, Fiber, FiberState } from './fiber.ts'
import type { Impl } from './reflect.ts'

const paperTraceSink = Symbol.for('cordis.paper-trace.sink')

/** Internal mutation observation consumed only by paper-conformance tests. */
export type CordisPaperTraceEvent =
  | { kind: 'fiber-created', fiber: Fiber, parent: Fiber }
  | { kind: 'fiber-retired', fiber: Fiber }
  | { kind: 'fiber-removed', fiber: Fiber }
  | { kind: 'target-changed', fiber: Fiber, previous: readonly Impl[], current: readonly Impl[] }
  | { kind: 'state-changed', fiber: Fiber, previous: FiberState, current: FiberState }
  | { kind: 'committed-changed', fiber: Fiber, previous: readonly Impl[], current: readonly Impl[] }
  | { kind: 'iteration-landed', fiber: Fiber, iterator: object, done: boolean, inverse?: Disposable }
  | { kind: 'iteration-raised', fiber: Fiber, iterator: object, reason: unknown }
  | { kind: 'inverse-collected', fiber: Fiber, iterator: object, inverse: Disposable }
  | { kind: 'inverse-started', fiber: Fiber, inverse: Disposable, structural: boolean }
  | { kind: 'inverse-finished', fiber: Fiber, inverse: Disposable, structural: boolean, failed: boolean }
  | { kind: 'service-provided', fiber: Fiber, implementation: Impl, realm: symbol }
  | { kind: 'service-withdrawing', fiber: Fiber, implementation: Impl, realm: symbol }
  | { kind: 'service-withdrawn', fiber: Fiber, implementation: Impl, realm: symbol }

/** Synchronous root-scoped sink used by source-only paper-conformance tests. */
export type CordisPaperTraceSink = (event: CordisPaperTraceEvent) => void

type TraceRoot = Context & {
  [paperTraceSink]?: CordisPaperTraceSink
}

/**
 * Install one internal paper trace sink.
 *
 * @param ctx - context whose root owns the sink.
 * @param sink - synchronous observation consumer.
 * @returns disposer that removes this sink while it remains installed.
 */
export function installCordisPaperTraceSink(ctx: Context, sink: CordisPaperTraceSink): () => void {
  const root = ctx.root as TraceRoot
  if (root[paperTraceSink]) {
    throw new Error('a Cordis paper trace sink is already installed on this root context')
  }
  Object.defineProperty(root, paperTraceSink, {
    configurable: true,
    value: sink,
  })
  return () => {
    if (root[paperTraceSink] === sink) delete root[paperTraceSink]
  }
}

/**
 * Emit an internal paper observation synchronously when a sink is installed.
 *
 * @param ctx - context whose root may own a sink.
 * @param event - complete mutation observation.
 * @returns nothing.
 */
export function emitCordisPaperTrace(ctx: Context, event: CordisPaperTraceEvent): void {
  const sink = (ctx.root as TraceRoot)[paperTraceSink]
  sink?.(event)
}
