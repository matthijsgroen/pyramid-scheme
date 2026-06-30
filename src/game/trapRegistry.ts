import type { TrapPlugin } from "./trapPlugin"

const registry = new Map<string, TrapPlugin>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const registerTrap = (plugin: TrapPlugin<any>) => registry.set(plugin.family, plugin as TrapPlugin<unknown>)

export const getTrapPlugin = (family: string): TrapPlugin | undefined => registry.get(family)
