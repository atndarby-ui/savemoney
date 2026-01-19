import { Category } from '../types';

export const CATEGORIES: Category[] = [
    // Chi tiêu
    { id: 'food', name: 'Ăn uống', icon: '🍔', type: 'expense', color: '#f43f5e', image: require('../../assets/icons/3d/food.png') },
    { id: 'transport', name: 'Di chuyển', icon: '🚗', type: 'expense', color: '#f59e0b', image: require('../../assets/icons/3d/transport.png') },
    { id: 'shopping', name: 'Mua sắm', icon: '🛍️', type: 'expense', color: '#8b5cf6', image: require('../../assets/icons/3d/shopping.png') },
    { id: 'health', name: 'Sức khỏe', icon: '💊', type: 'expense', color: '#ef4444', image: require('../../assets/icons/3d/health.png') },
    { id: 'entertainment', name: 'Giải trí', icon: '🎬', type: 'expense', color: '#ec4899', image: require('../../assets/icons/3d/entertainment.png') },
    { id: 'education', name: 'Giáo dục', icon: '🎓', type: 'expense', color: '#6366f1', image: require('../../assets/icons/3d/education.png') },
    // Thu nhập
    { id: 'salary', name: 'Lương', icon: '💰', type: 'income', color: '#10b981', image: require('../../assets/icons/3d/salary.png') },
    { id: 'gift', name: 'Quà tặng', icon: '🎁', type: 'income', color: '#3b82f6', image: require('../../assets/icons/3d/gift.png') },
    { id: 'investment', name: 'Đầu tư', icon: '📈', type: 'income', color: '#8b5cf6', image: require('../../assets/icons/3d/investment.png') },
    { id: 'other', name: 'Khác', icon: '💎', type: 'income', color: '#64748b', image: require('../../assets/icons/3d/other.png') },
];

export const INITIAL_TRANSACTIONS = [];
