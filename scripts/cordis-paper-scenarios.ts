import assert from 'node:assert/strict'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import { mountAgentLoopTestDependencies } from '@deepseek-ai/dsh-agent-loop-testkit'
import type { Context, Fiber } from '@deepseek-ai/cordis'

interface TraceAssumptions {
  readonly AcyclicDependencies: boolean
  readonly FiniteNames: boolean
  readonly BoundedIterator: boolean
  readonly PairwiseIndependent: boolean
  readonly TotalProvision: boolean
  readonly NoFailure: boolean
}

interface ScenarioRecorder {
  readonly root: Context
  readonly fiberState: Readonly<Record<string, number>>
}

interface ScenarioDefinition {
  readonly name: string
  readonly assumptions: TraceAssumptions
  readonly requiredProperties: readonly string[]
  run(implementation: unknown, recorder: ScenarioRecorder): Promise<void>
}

const assumptions = {
  AcyclicDependencies: true,
  FiniteNames: true,
  BoundedIterator: true,
  PairwiseIndependent: true,
  TotalProvision: true,
  NoFailure: true,
}

const requiredProperties = [
  'Preservation',
  'RecoveryExactness',
  'Ordering',
  'ResolutionCoherence',
  'ProgressBound',
]

function deferred(): { readonly promise: Promise<void>; readonly resolve: () => void } {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

/** DeepSeek Harness scenarios appended to the upstream Cordis conformance kit. */
export const scenarios = [
  {
    name: 'vendored-reentrant-dispose',
    assumptions,
    requiredProperties,
    async run(_implementation, recorder) {
      const restored: string[] = []
      const started = deferred()
      let disposal!: Promise<void>
      const fiber = recorder.root.plugin({
        name: 'reentrant-dispose',
        apply(ctx: Context) {
          ctx.effect(() => () => { restored.push('cleanup') }, 'reentrant cleanup')
          disposal = ctx.fiber.dispose()
          started.resolve()
        },
      })
      await started.promise
      await disposal
      assert.deepEqual(restored, ['cleanup'])
      assert.equal(fiber.state, recorder.fiberState.DISPOSED)
    },
  },
  {
    name: 'vendored-pending-effect',
    assumptions,
    requiredProperties,
    async run(_implementation, recorder) {
      let applied = false
      let restored = 0
      const seen = new WeakSet<Fiber>()
      recorder.root.on('internal/plugin', (fiber) => {
        if (fiber.runtime?.name !== 'pending-effect' || fiber.uid === null || seen.has(fiber)) return
        seen.add(fiber)
        fiber.ctx.effect(() => () => { restored++ }, 'pending observer effect')
      })
      const fiber = recorder.root.plugin({
        name: 'pending-effect',
        inject: ['missing-service'],
        apply() {
          applied = true
        },
      })
      await fiber.dispose()
      assert.equal(applied, false)
      assert.equal(restored, 1)
      assert.equal(fiber.state, recorder.fiberState.DISPOSED)
    },
  },
  {
    name: 'vendored-async-cleanup-join',
    assumptions,
    requiredProperties,
    async run(_implementation, recorder) {
      const started = deferred()
      const release = deferred()
      let cleanupCalls = 0
      let disposeEffect!: () => Promise<void>
      const fiber = await recorder.root.plugin({
        name: 'async-cleanup-join',
        apply(ctx: Context) {
          disposeEffect = ctx.effect(() => async () => {
            cleanupCalls++
            started.resolve()
            await release.promise
          }, 'joined cleanup')
        },
      })
      const direct = disposeEffect()
      await started.promise
      let ownerSettled = false
      const owner = fiber.dispose().then(() => { ownerSettled = true })
      await Promise.resolve()
      assert.equal(ownerSettled, false)
      release.resolve()
      await Promise.all([direct, owner])
      assert.equal(cleanupCalls, 1)
      assert.equal(fiber.state, recorder.fiberState.DISPOSED)
    },
  },
  {
    name: 'deepseek-agent-loop-assembly',
    assumptions,
    requiredProperties,
    async run(_implementation, recorder) {
      const root = recorder.root
      await mountAgentLoopTestDependencies(root)
      const loop = await root.plugin(AgentLoop, { agents: [] })
      assert.equal(loop.state, recorder.fiberState.ACTIVE)
      assert.ok(Object.keys(loop.store ?? {}).length > 0)
      await root.fiber.dispose()
      assert.equal(loop.state, recorder.fiberState.DISPOSED)
      assert.equal(root.registry.size, 0)
      assert.equal(root.fiber.inertia, undefined)
    },
  },
] satisfies readonly ScenarioDefinition[]
