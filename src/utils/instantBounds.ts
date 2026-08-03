import dayjs, { type Dayjs } from 'dayjs';

/**
 * Bounds for a date *and time* picker.
 *
 * `disabledDate` only reaches whole days, so a bound of "3 Aug, 5:00 pm" leaves
 * the whole of 3 August pickable — including 9:00 am, which is on the wrong
 * side of it. These build the matching hour and minute bans, so the boundary
 * day is half open rather than all open: an invalid moment simply cannot be
 * clicked, instead of being accepted and corrected afterwards.
 */

export interface DisabledTimes {
  disabledHours?: () => number[];
  disabledMinutes?: (hour: number) => number[];
}

const range = (from: number, to: number): number[] => {
  const out: number[] = [];
  for (let i = from; i <= to; i += 1) out.push(i);
  return out;
};

const parse = (instant?: string): Dayjs | null => {
  if (!instant) return null;
  const day = dayjs(instant);
  return day.isValid() ? day : null;
};

/** The later of two instants — for a field carrying two lower bounds at once. */
export const laterOf = (a?: string, b?: string): string | undefined => {
  const left = parse(a);
  const right = parse(b);
  if (!left) return b;
  if (!right) return a;
  return left.isAfter(right) ? a : b;
};

/**
 * Which hours and minutes are out of bounds on the day being shown.
 *
 * Only the boundary days have anything disabled: days wholly outside the range
 * are already unreachable through `disabledDate`, and days wholly inside it are
 * free.
 */
export const disabledTimesAt = (
  day: Dayjs | null | undefined,
  min?: string,
  max?: string,
): DisabledTimes => {
  if (!day) return {};

  const lower = parse(min);
  const upper = parse(max);

  const onLowerDay = Boolean(lower && day.isSame(lower, 'day'));
  const onUpperDay = Boolean(upper && day.isSame(upper, 'day'));
  if (!onLowerDay && !onUpperDay) return {};

  const hours: number[] = [
    ...(onLowerDay && lower ? range(0, lower.hour() - 1) : []),
    ...(onUpperDay && upper ? range(upper.hour() + 1, 23) : []),
  ];

  return {
    disabledHours: () => hours,
    disabledMinutes: (hour: number) => [
      // Only the boundary hour itself is part-disabled; the hours either side
      // of it are already gone above.
      ...(onLowerDay && lower && hour === lower.hour() ? range(0, lower.minute() - 1) : []),
      ...(onUpperDay && upper && hour === upper.hour() ? range(upper.minute() + 1, 59) : []),
    ],
  };
};
