import { Category } from '../types';

export const CATEGORIES: Category[] = [
    // Chi tiêu
    { id: 'food', name: 'Ăn uống', icon: '🍔', type: 'expense', color: '#f43f5e' },
    { id: 'transport', name: 'Di chuyển', icon: '🚗', type: 'expense', color: '#f59e0b' },
    { id: 'shopping', name: 'Mua sắm', icon: '🛍️', type: 'expense', color: '#8b5cf6' },
    { id: 'health', name: 'Sức khỏe', icon: '💊', type: 'expense', color: '#ef4444' },
    { id: 'entertainment', name: 'Giải trí', icon: '🎬', type: 'expense', color: '#ec4899' },
    { id: 'education', name: 'Giáo dục', icon: '🎓', type: 'expense', color: '#6366f1' },
    // Thu nhập
    { id: 'salary', name: 'Lương', icon: '💰', type: 'income', color: '#10b981' },
    { id: 'gift', name: 'Quà tặng', icon: '🎁', type: 'income', color: '#3b82f6' },
    { id: 'investment', name: 'Đầu tư', icon: '📈', type: 'income', color: '#8b5cf6' },
    { id: 'other', name: 'Khác', icon: '💎', type: 'income', color: '#64748b' },
];

export const INITIAL_TRANSACTIONS = [];
