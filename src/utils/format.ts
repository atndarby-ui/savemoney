export const formatCurrency = (amount: number): string => {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export const formatCompactCurrency = (amount: number): string => {
    const absAmount = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';

    if (absAmount >= 1000000) {
        return `${sign}${(absAmount / 1000000).toFixed(1)}tr`;
    }
    if (absAmount >= 1000) {
        return `${sign}${Math.floor(absAmount / 1000)}k`;
    }
    return formatCurrency(amount);
};

export const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
        date1.getDate() === date2.getDate() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getFullYear() === date2.getFullYear()
    );
};
