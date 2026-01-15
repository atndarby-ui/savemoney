export const formatCurrency = (amount: number): string => {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export const formatCompactCurrency = (amount: number): string => {
    if (amount >= 1000000) {
        return `${(amount / 1000000).toFixed(1)}tr`;
    }
    if (amount >= 1000) {
        return `${Math.floor(amount / 1000)}k`;
    }
    return amount.toString();
};

export const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
        date1.getDate() === date2.getDate() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getFullYear() === date2.getFullYear()
    );
};
