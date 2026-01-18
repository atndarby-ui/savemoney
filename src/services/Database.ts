import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction, Category, Message } from '../types';
import { INITIAL_TRANSACTIONS, CATEGORIES } from '../constants';

const DB_NAME = 'savemoney.db';

export class Database {
    private static db: SQLite.SQLiteDatabase;

    static async init() {
        try {
            if (!this.db) {
                this.db = await SQLite.openDatabaseAsync(DB_NAME);
            }
            await this.createTables();
            await this.migrateFromAsyncStorage();
        } catch (error) {
            console.error('Database initialization failed:', error);
        }
    }

    private static async createTables() {
        try {
            await this.db.execAsync(`
        PRAGMA journal_mode = WAL;
        
        CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY,
          amount REAL NOT NULL,
          type TEXT NOT NULL,
          categoryId TEXT,
          date TEXT NOT NULL,
          note TEXT,
          imageUri TEXT
        );

        CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          icon TEXT NOT NULL,
          type TEXT NOT NULL,
          color TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS metadata (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS chat_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          role TEXT NOT NULL,
          text TEXT NOT NULL,
          timestamp INTEGER DEFAULT (strftime('%s', 'now'))
        );
      `);
            console.log('Tables created successfully');
        } catch (error) {
            console.error('Error creating tables:', error);
        }
    }

    private static async migrateFromAsyncStorage() {
        try {
            const migrated = await this.getMetadata('migrated_v1');
            if (migrated === 'true') {
                console.log('Already migrated');
                return;
            }

            console.log('Starting migration...');

            // 1. Transactions
            const savedTx = await AsyncStorage.getItem('mintflow_transactions');
            if (savedTx) {
                const transactions: any[] = JSON.parse(savedTx);
                for (const tx of transactions) {
                    // Convert date string back to Date object for compatibility with addTransaction
                    const preparedTx = {
                        ...tx,
                        date: new Date(tx.date)
                    };
                    await this.addTransaction(preparedTx);
                }
            } else {
                // Init with defaults if empty
                // Check if table is empty first to avoid duplicates if migration ran partially?
                // But since we key by ID, it might fail or replace.
                // For fresh install, let's just use defaults.
                // But wait, if it's a fresh install, AsyncStorage is null.
                // We should insert INITIAL_TRANSACTIONS.
                // However, if we only do this on migration, we are good.
                // "Migrate" usually means moving existing user data.
                // If no user data, we seed.

                // Let's check if we have transactions in DB.
                const countResult = await this.db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM transactions');
                if (countResult && countResult.count === 0) {
                    for (const tx of INITIAL_TRANSACTIONS) {
                        await this.addTransaction(tx);
                    }
                }
            }

            // 2. Categories
            const savedCats = await AsyncStorage.getItem('mintflow_categories');
            if (savedCats) {
                const categories: Category[] = JSON.parse(savedCats);
                for (const cat of categories) {
                    await this.addCategory(cat);
                }
            } else {
                const countResult = await this.db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM categories');
                if (countResult && countResult.count === 0) {
                    for (const cat of CATEGORIES) {
                        await this.addCategory(cat);
                    }
                }
            }

            // 3. Chat History (optional but good to have)
            const savedChat = await AsyncStorage.getItem('mintflow_chat_history');
            if (savedChat) {
                const messages: Message[] = JSON.parse(savedChat);
                for (const msg of messages) {
                    await this.addChatMessage(msg);
                }
            }

            await this.setMetadata('migrated_v1', 'true');
            console.log('Migration completed successfully');

        } catch (error) {
            console.error('Migration failed:', error);
        }
    }

    // Transaction Methods
    static async getTransactions(): Promise<Transaction[]> {
        try {
            if (!this.db) return [];
            const result = await this.db.getAllAsync<any>('SELECT * FROM transactions ORDER BY date DESC');
            return result.map(row => ({
                ...row,
                date: new Date(row.date) // Convert ISO string back to Date object
            }));
        } catch (error) {
            console.error('getTransactions error:', error);
            return [];
        }
    }

    static async addTransaction(tx: Transaction) {
        try {
            if (!this.db) {
                console.error('addTransaction: Database not initialized');
                return;
            }
            // Ensure date is a valid Date object before calling toISOString()
            const dateObj = tx.date instanceof Date ? tx.date : new Date(tx.date);
            const isoDate = !isNaN(dateObj.getTime()) ? dateObj.toISOString() : new Date().toISOString();

            await this.db.runAsync(
                'INSERT OR REPLACE INTO transactions (id, amount, type, categoryId, date, note, imageUri) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [tx.id, tx.amount, tx.type, tx.categoryId, isoDate, tx.note || '', tx.imageUri || null]
            );
        } catch (error) {
            console.error('addTransaction error:', error);
        }
    }

    static async updateTransaction(tx: Transaction) {
        // replace handles update effectively if ID matches
        await this.addTransaction(tx);
    }

    static async deleteTransaction(id: string) {
        await this.db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
    }

    // Category Methods
    static async getCategories(): Promise<Category[]> {
        try {
            if (!this.db) return [];
            return await this.db.getAllAsync<Category>('SELECT * FROM categories');
        } catch (error) {
            console.error('getCategories error:', error);
            return [];
        }
    }

    static async addCategory(cat: Category) {
        try {
            if (!this.db) {
                console.error('addCategory: Database not initialized');
                return;
            }
            await this.db.runAsync(
                'INSERT OR REPLACE INTO categories (id, name, icon, type, color) VALUES (?, ?, ?, ?, ?)',
                [cat.id, cat.name, cat.icon, cat.type, cat.color]
            );
        } catch (error) {
            console.error('addCategory error:', error);
        }
    }

    static async updateCategory(cat: Category) {
        await this.addCategory(cat);
    }

    static async deleteCategory(id: string) {
        await this.db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
    }

    // Chat Methods
    static async getChatHistory(): Promise<Message[]> {
        try {
            if (!this.db) return [];
            return await this.db.getAllAsync<Message>('SELECT role, text FROM chat_history ORDER BY id ASC');
        } catch (error) {
            console.error('getChatHistory error', error);
            return [];
        }
    }

    static async addChatMessage(msg: Message) {
        try {
            if (!this.db) {
                console.error('addChatMessage: Database not initialized');
                return;
            }
            // Ensure no null/undefined values are passed to SQLite to avoid Native NullPointerException
            const role = msg.role || 'user';
            const text = msg.text || '';

            await this.db.runAsync(
                'INSERT INTO chat_history (role, text) VALUES (?, ?)',
                [role, text]
            );
        } catch (error) {
            console.error('addChatMessage error', error);
        }
    }

    static async clearChatHistory() {
        await this.db.runAsync('DELETE FROM chat_history');
    }

    // Metadata Methods
    static async getMetadata(key: string): Promise<string | null> {
        try {
            if (!this.db) return null;
            const result = await this.db.getFirstAsync<{ value: string }>('SELECT value FROM metadata WHERE key = ?', [key]);
            return result ? result.value : null;
        } catch (error) {
            console.error('getMetadata error:', error);
            return null;
        }
    }

    static async setMetadata(key: string, value: string) {
        try {
            if (!this.db) {
                // Try to init if missing? Or just log
                console.warn('setMetadata: Database not initialized, skipping save for key:', key);
                return;
            }
            await this.db.runAsync('INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)', [key, value]);
        } catch (error) {
            console.error('setMetadata error:', error);
        }
    }

    static async clearAllData() {
        try {
            if (!this.db) return;
            await this.db.execAsync(`
                DELETE FROM transactions;
                DELETE FROM categories;
                DELETE FROM chat_history;
                DELETE FROM metadata;
            `);
            console.log('All data cleared from SQLite');
        } catch (error) {
            console.error('clearAllData error:', error);
        }
    }
}
