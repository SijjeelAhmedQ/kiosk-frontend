/**
 * Modifier group rules, kept in one place because the server enforces them too.
 *
 * `usp_Orders_Create` rejects a whole order with MODIFIER_GROUP_INVALID when a
 * required group on any line has fewer picks than `min` or more than `max` — so
 * a line must never reach the cart breaking them. Sizes are the usual case: a
 * drink or a shake cannot be made without one.
 */

import type { CartLineModifier, Modifier, ModifierGroup } from '@/types';

/** Selection state as the detail modal holds it: modifier id → picked. */
export type Selection = Record<string, boolean>;

export const pickedInGroup = (group: ModifierGroup, selected: Selection): number =>
  group.modifierIds.filter((id) => selected[id]).length;

/** Required groups the current selection does not satisfy. Empty means orderable. */
export const unsatisfiedGroups = (groups: ModifierGroup[], selected: Selection): ModifierGroup[] =>
  groups.filter((g) => {
    if (!g.required) return false;
    const picked = pickedInGroup(g, selected);
    return picked < g.min || picked > g.max;
  });

/**
 * A starting selection that satisfies every required group: its `min` cheapest
 * options, so nothing is silently charged for beyond the listed price. Options
 * the catalog did not return are skipped — the modal hides those too.
 */
export const defaultSelection = (groups: ModifierGroup[], available: Modifier[]): Selection => {
  const byId = new Map(available.map((m) => [m.id, m]));
  const selected: Selection = {};

  for (const group of groups) {
    if (!group.required || group.min <= 0) continue;
    group.modifierIds
      .map((id) => byId.get(id))
      .filter((m): m is Modifier => !!m)
      .sort((a, b) => a.priceDelta - b.priceDelta)
      .slice(0, group.min)
      .forEach((m) => { selected[m.id] = true; });
  }

  return selected;
};

/** The same defaults, shaped as cart line modifiers. */
export const defaultLineModifiers = (
  groups: ModifierGroup[],
  available: Modifier[],
): CartLineModifier[] => {
  const selected = defaultSelection(groups, available);
  return available
    .filter((m) => selected[m.id])
    .map((m) => ({ modifierId: m.id, name: m.name, priceDelta: m.priceDelta }));
};
