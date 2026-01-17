import { getLunarDate as getVnLunarDate } from '@dqcai/vn-lunar';

export const getLunarDate = (date: Date) => {
    try {
        const dd = date.getDate();
        const mm = date.getMonth() + 1;
        const yyyy = date.getFullYear();

        const lunar = getVnLunarDate(dd, mm, yyyy);

        const d = lunar.day;
        const m = lunar.month;

        let emoji = '🌑';
        if (d === 1) emoji = '🌑'; // New Moon
        else if (d <= 7) emoji = '🌒'; // Waxing Crescent
        else if (d === 8) emoji = '🌓'; // First Quarter
        else if (d <= 14) emoji = '🌔'; // Waxing Gibbous
        else if (d <= 16) emoji = '🌕'; // Full Moon
        else if (d <= 22) emoji = '🌖'; // Waning Gibbous
        else if (d === 23) emoji = '🌗'; // Last Quarter
        else emoji = '🌘'; // Waning Crescent

        const dateString = `${d}/${m}`;

        return {
            dateString: dateString,
            moonEmoji: emoji,
            fullString: `${dateString} Âm lịch`
        };
    } catch (e) {
        console.warn("Lunar conversion failed", e);
        // Fallback
        return {
            dateString: `${date.getDate()}/??`,
            moonEmoji: '🌑',
            fullString: `??/?? Âm lịch`
        };
    }
};
