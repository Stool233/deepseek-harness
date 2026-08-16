import { Context, CordisError, FiberState, type Fiber } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'

/**
 * Direct regressions for the vendored Cordis ownership substrate used by
 * tool-cordis's dynamic plugin tree and every other harness plugin.
 */

describe('Cordis effect ownership', () => {
  it('makes an effect visible to a reentrant owner restart and awaits setup plus cleanup', async () => {
    const ctx = new Context()
    const setupGate = Promise.withResolvers<undefined>()
    const cleanupGate = Promise.withResolvers<undefined>()
    const cleanupStarted = Promise.withResolvers<undefined>()
    let restarted!: Promise<void>
    let setupFinished = false
    let cleanupFinished = false

    ctx.effect(async () => {
      restarted = ctx.fiber.restart()
      await setupGate.promise
      setupFinished = true
      return async () => {
        cleanupStarted.resolve(undefined)
        await cleanupGate.promise
        cleanupFinished = true
      }
    }, 'reentrant-restart')

    let settled = false
    void restarted.then(() => { settled = true })
    await Promise.resolve()
    expect(settled).toBe(false)

    setupGate.resolve(undefined)
    await cleanupStarted.promise
    expect(setupFinished).toBe(true)
    await Promise.resolve()
    expect(settled).toBe(false)

    cleanupGate.resolve(undefined)
    await restarted
    expect(cleanupFinished).toBe(true)
    expect(ctx.fiber.getEffects()).toEqual([])
  })

  it('rolls back collected cleanup and its owner-list entry when setup throws synchronously', () => {
    const ctx = new Context()
    let cleanups = 0

    expect(() => ctx.effect(function* () {
      yield () => { cleanups += 1 }
      throw new Error('setup failed')
    }, 'throwing-setup')).toThrow('setup failed')

    expect(cleanups).toBe(1)
    expect(ctx.fiber.getEffects()).toEqual([])
  })

  it('makes a reentrant owner restart await asynchronous rollback after synchronous setup failure', async () => {
    const ctx = new Context()
    const cleanupGate = Promise.withResolvers<undefined>()
    const cleanupStarted = Promise.withResolvers<undefined>()
    let restarted!: Promise<void>

    expect(() => ctx.effect(function* () {
      yield async () => {
        cleanupStarted.resolve(undefined)
        await cleanupGate.promise
      }
      restarted = ctx.fiber.restart()
      throw new Error('setup failed after restart')
    }, 'reentrant-throw')).toThrow('setup failed after restart')

    await cleanupStarted.promise
    let settled = false
    void restarted.then(() => { settled = true })
    await Promise.resolve()
    expect(settled).toBe(false)

    cleanupGate.resolve(undefined)
    await restarted
    expect(ctx.fiber.getEffects()).toEqual([])
  })

  it('keeps ordinary teardown synchronous and the public disposer single-shot', () => {
    const ctx = new Context()
    let cleanups = 0
    const dispose = ctx.effect(() => () => { cleanups += 1 }, 'sync-effect')

    expect(dispose()).toBeUndefined()
    expect(cleanups).toBe(1)
    expect(dispose()).toBeUndefined()
    expect(cleanups).toBe(1)
    expect(ctx.fiber.getEffects()).toEqual([])
  })

  it('rejects cleanup-time registration while a restart is unloading', async () => {
    const ctx = new Context()
    let registrationError: unknown

    ctx.effect(() => () => {
      try {
        ctx.effect(() => () => {}, 'too-late')
      } catch (error) {
        registrationError = error
      }
    }, 'restart-cleanup')

    await ctx.fiber.restart()
    expect(registrationError).toBeInstanceOf(CordisError)
    expect((registrationError as CordisError).code).toBe('INACTIVE_EFFECT')
    expect(ctx.fiber.state).toBe(FiberState.ACTIVE)
    expect(ctx.fiber.getEffects()).toEqual([])
  })

  it('keeps effect registration legal while child fibers are PENDING and LOADING', async () => {
    const ctx = new Context()
    let pendingCleanup = false
    let loadingCleanup = false

    ctx.on('internal/plugin', (fiber) => {
      if (fiber.name !== 'state-probe' || fiber.uid === null) return
      expect(fiber.state).toBe(FiberState.PENDING)
      fiber.ctx.effect(() => () => { pendingCleanup = true }, 'pending-effect')
    })

    const fiber = await ctx.plugin({
      name: 'state-probe',
      apply(inner) {
        expect(inner.fiber.state).toBe(FiberState.LOADING)
        inner.effect(() => () => { loadingCleanup = true }, 'loading-effect')
      },
    })
    await fiber.dispose()

    expect(pendingCleanup).toBe(true)
    expect(loadingCleanup).toBe(true)
  })

  it('resolves dependencies that internal/plugin adds before child activation', async () => {
    const ctx = new Context()
    ctx.provide('late-inject', {})
    let applyCalls = 0

    ctx.on('internal/plugin', (fiber) => {
      if (fiber.name !== 'loader-shaped' || fiber.uid === null) return
      fiber.inject['late-inject'] = {}
    })

    const fiber = await ctx.plugin({
      name: 'loader-shaped',
      apply() {
        applyCalls += 1
      },
    })

    expect(applyCalls).toBe(1)
    expect(fiber.state).toBe(FiberState.ACTIVE)
  })

  it('keeps provider resources until asynchronous consumers finish unloading', async () => {
    const ctx = new Context()
    const resource = { available: true }
    const observations: boolean[] = []

    const provider = await ctx.plugin((inner) => {
      inner.provide('resource', resource)
      inner.effect(() => () => { resource.available = false }, 'provider-resource')
    })
    const consumer = await ctx.plugin({
      inject: ['resource'],
      apply(inner) {
        void inner.get('resource')
        return async () => {
          await Promise.resolve()
          observations.push(resource.available)
        }
      },
    })

    await provider.dispose()

    expect(observations).toEqual([true])
    expect(resource.available).toBe(false)
    expect(consumer.state).toBe(FiberState.PENDING)
  })

  it('keeps retiring consumers discoverable during concurrent root disposal', async () => {
    const ctx = new Context()
    const resource = { available: true }
    const observations: boolean[] = []
    const cleanupStarted = Promise.withResolvers<undefined>()
    const cleanupGate = Promise.withResolvers<undefined>()

    await ctx.plugin((inner) => {
      inner.provide('resource', resource)
      inner.effect(() => () => { resource.available = false }, 'provider-resource')
    })
    await ctx.plugin({
      inject: ['resource'],
      apply(inner) {
        void inner.get('resource')
        return async () => {
          cleanupStarted.resolve(undefined)
          await cleanupGate.promise
          observations.push(resource.available)
        }
      },
    })

    const disposing = ctx.fiber.dispose()
    await cleanupStarted.promise
    await Promise.resolve()
    await Promise.resolve()
    expect(resource.available).toBe(true)
    cleanupGate.resolve(undefined)
    await disposing

    expect(observations).toEqual([true])
    expect(resource.available).toBe(false)
  })

  it('drains effects when disposal wins the deferred reload checkpoint', async () => {
    const ctx = new Context()
    const cleanup = vi.fn()
    const apply = vi.fn()
    const fiber = ctx.plugin(apply)
    fiber.ctx.effect(() => cleanup, 'loading-cleanup')

    await fiber.dispose()

    expect(apply).not.toHaveBeenCalled()
    expect(cleanup).toHaveBeenCalledOnce()
    expect(fiber.getEffects()).toEqual([])
    expect(fiber.state).toBe(FiberState.DISPOSED)
  })

  it('settles transitive service activation before an awaited provider returns', async () => {
    const ctx = new Context()
    const command = vi.fn()

    ctx.plugin({
      inject: ['cli'],
      apply(inner) {
        inner.provide('yakumo', true)
      },
    })
    const commandFiber = ctx.plugin({
      inject: ['yakumo', 'cli'],
      apply: command,
    })

    await ctx.plugin(inner => inner.provide('cli', true))

    expect(command).toHaveBeenCalledOnce()
    expect(commandFiber.state).toBe(FiberState.ACTIVE)
  })

  it('starts independent top-level recovery concurrently in reverse order', async () => {
    const ctx = new Context()
    const order: string[] = []
    let active = 0
    let maximum = 0
    const recover = async (label: string) => {
      order.push(`${label}:start`)
      maximum = Math.max(maximum, ++active)
      await Promise.resolve()
      order.push(`${label}:end`)
      active--
    }
    const fiber = await ctx.plugin((inner) => {
      inner.effect(() => () => recover('first'), 'first')
      inner.effect(() => () => recover('second'), 'second')
    })

    await fiber.dispose()

    expect(order).toEqual([
      'second:start',
      'first:start',
      'second:end',
      'first:end',
    ])
    expect(maximum).toBe(2)
  })
})

describe('Cordis child publication ownership', () => {
  it('rolls back parent and runtime ownership when internal/plugin publication throws', () => {
    const ctx = new Context()
    const plugin = { name: 'publication-failure', apply() {} }
    ctx.on('internal/plugin', (fiber) => {
      if (fiber.name === plugin.name) throw new Error('publication failed')
    })

    expect(() => ctx.plugin(plugin)).toThrow('publication failed')
    expect(ctx.registry.has(plugin)).toBe(false)
  })

  it('contains teardown notification failures so ownership cleanup and peers complete', async () => {
    const ctx = new Context()
    const errors: unknown[] = []
    ctx.logger.error = ((error: unknown) => { errors.push(error) }) as typeof ctx.logger.error
    const observed: string[] = []
    ctx.on('internal/plugin', (fiber) => {
      if (fiber.name === 'contained-teardown' && fiber.uid === null) {
        throw new Error('broken teardown observer')
      }
    })
    ctx.on('internal/plugin', (fiber) => {
      if (fiber.name === 'contained-teardown' && fiber.uid === null) observed.push('disposed')
    })
    const child = await ctx.plugin({ name: 'contained-teardown', apply() {} })

    await expect(child.dispose()).resolves.toBeUndefined()
    expect(observed).toEqual(['disposed'])
    expect(errors).toHaveLength(1)
    expect(errors[0]).toEqual(expect.objectContaining({ message: 'broken teardown observer' }))
    expect(child.uid).toBeNull()
  })

  it('makes a LOADING parent join child cleanup started before its unload snapshot', async () => {
    const ctx = new Context()
    const cleanupGate = Promise.withResolvers<undefined>()
    const cleanupStarted = Promise.withResolvers<undefined>()
    let ownerFiber!: Fiber
    let ownerDisposal!: Promise<void>
    let childDisposal!: Promise<void>
    let childFiber!: Fiber

    ctx.on('internal/plugin', (fiber) => {
      if (fiber.name !== 'loading-child' || fiber.uid === null) return
      childFiber = fiber
      fiber.ctx.effect(() => async () => {
        cleanupStarted.resolve(undefined)
        await cleanupGate.promise
      }, 'loading-child-cleanup')
      ownerDisposal = ownerFiber.dispose()
      childDisposal = Promise.resolve(fiber.dispose())
    })

    const ownerMount = ctx.plugin({
      name: 'loading-owner',
      apply(inner) {
        ownerFiber = inner.fiber
        inner.plugin({ name: 'loading-child', apply() {} })
      },
    })

    await cleanupStarted.promise
    let ownerSettled = false
    void ownerDisposal.then(() => { ownerSettled = true })
    await Promise.resolve()
    expect(ownerSettled).toBe(false)

    cleanupGate.resolve(undefined)
    await Promise.all([ownerDisposal, childDisposal, ownerMount])
    expect(childFiber.uid).toBeNull()
    expect(ownerFiber.uid).toBeNull()
  })

  it('lets parent disposal during internal/plugin await the unpublished child to quiescence', async () => {
    const ctx = new Context()
    let ownerCtx!: Context
    const owner = await ctx.plugin({
      name: 'owner',
      apply(inner) {
        ownerCtx = inner
      },
    })

    const cleanupGate = Promise.withResolvers<undefined>()
    const cleanupStarted = Promise.withResolvers<undefined>()
    let cleanupFinished = false
    let childApplyCalls = 0
    let parentDisposal!: Promise<void>

    ctx.on('internal/plugin', (fiber) => {
      if (fiber.name !== 'child' || fiber.uid === null) return
      expect(fiber.state).toBe(FiberState.PENDING)
      fiber.ctx.effect(() => async () => {
        cleanupStarted.resolve(undefined)
        await cleanupGate.promise
        cleanupFinished = true
      }, 'pending-child-cleanup')
    })
    ctx.on('internal/plugin', (fiber) => {
      if (fiber.name !== 'child' || fiber.uid === null) return
      parentDisposal = owner.dispose()
    })

    const child = ownerCtx.plugin({
      name: 'child',
      apply() {
        childApplyCalls += 1
      },
    })

    await cleanupStarted.promise
    let settled = false
    void parentDisposal.then(() => { settled = true })
    await Promise.resolve()
    expect(settled).toBe(false)

    cleanupGate.resolve(undefined)
    await parentDisposal
    expect(cleanupFinished).toBe(true)
    expect(childApplyCalls).toBe(0)
    expect(child.uid).toBeNull()
    expect(child.state).toBe(FiberState.DISPOSED)
  })
})
