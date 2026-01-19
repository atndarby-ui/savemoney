export type TransactionType = 'income' | 'expense';

export interface Transaction {
    id: string;
    amount: number;
    type: TransactionType;
    categoryId: string;
    date: Date;
    note?: string;
    imageUri?: string;
}

export interface Category {
    id: string;
    name: string;
    icon: string;
    type: TransactionType;
    color: string;
    image?: any;
    icon3dId?: string;
}

export type TimeRange = 'today' | '7days' | '30days' | 'month';

export interface DailySummary {
    date: Date;
    income: number;
    expense: number;
}

export interface Message {
    role: 'user' | 'model';
    text: string;
}
