import { APP } from '@/constants/app.constants';

const formatter = new Intl.NumberFormat(APP.locale, {
  style: 'currency',
  currency: APP.currency,
  currencyDisplay: 'narrowSymbol', // renders "Rs" for PKR
  minimumFractionDigits: 0, // whole rupees, no paisa
  maximumFractionDigits: 0,
});

export const formatCurrency = (value: number): string => formatter.format(value);

export const formatCalories = (cal: number): string => `${cal.toLocaleString()} Cal`;
