import { auth, db } from '../config/firebase';
import { doc, setDoc, getDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { Database } from './Database';
import { Alert } from 'react-native';

export const SyncService = {
    uploadBackup: async () => {
        try {
            const user = auth.currentUser;
            if (!user) {
                Alert.alert('Login Required', 'Please log in to backup your data.');
                return;
            }

            // 1. Gather all data from Local SQLite
            const transactions = await Database.getTransactions();
            const categories = await Database.getCategories();
            const chatHistory = await Database.getChatHistory();

            // 2. Prepare payload
            const backupData = {
                transactions,
                categories,
                chatHistory,
                updatedAt: serverTimestamp(),
                deviceInfo: {
                    platform: 'mobile', // Simplified
                }
            };

            // 3. Upload to Firestore
            // path: users/{userId}/backups/latest
            const backupRef = doc(db, 'users', user.uid, 'backups', 'latest');
            await setDoc(backupRef, backupData);

            Alert.alert('Success', 'Data backed up successfully!');
        } catch (error: any) {
            console.error('Backup error:', error);
            Alert.alert('Backup Failed', error.message);
        }
    },

    downloadBackup: async (onSuccess?: () => void) => {
        try {
            const user = auth.currentUser;
            if (!user) {
                Alert.alert('Login Required', 'Please log in to restore your data.');
                return;
            }

            // 1. Fetch from Firestore
            console.log('Fetching backup from Firestore...');
            const backupRef = doc(db, 'users', user.uid, 'backups', 'latest');
            const docSnap = await getDoc(backupRef);

            if (!docSnap.exists()) {
                console.log('No backup found in Firestore');
                Alert.alert('No Backup Found', 'You haven\'t backed up any data yet.');
                return;
            }

            const data = docSnap.data() || {};
            console.log('Backup data fetched keys:', Object.keys(data));

            // 2. Restore to SQLite
            console.log('Restoring data to SQLite...');

            // Robust array helper: Firestore sometimes stores objects with numeric keys instead of arrays
            const getAsArray = (val: any) => {
                if (Array.isArray(val)) return val;
                if (val && typeof val === 'object') {
                    const keys = Object.keys(val);
                    if (keys.length > 0 && keys.every(k => !isNaN(parseInt(k)))) {
                        return keys.sort((a, b) => parseInt(a) - parseInt(b)).map(k => val[k]);
                    }
                }
                return null;
            };

            const transactions = getAsArray(data.transactions);
            if (transactions) {
                console.log(`Processing ${transactions.length} transactions...`);
                for (const tx of transactions) {
                    let dateVal = tx.date;

                    // Handle Firestore Timestamp
                    if (dateVal && typeof dateVal.toDate === 'function') {
                        dateVal = dateVal.toDate();
                    }
                    // Handle object with seconds/nanoseconds (if it lost its prototype)
                    else if (dateVal && typeof dateVal === 'object' && 'seconds' in dateVal) {
                        dateVal = new Date(dateVal.seconds * 1000);
                    }
                    // Handle ISO string
                    else if (dateVal && typeof dateVal === 'string') {
                        dateVal = new Date(dateVal);
                    }

                    // Ensure we have a valid Date object
                    if (!(dateVal instanceof Date) || isNaN(dateVal.getTime())) {
                        console.warn('Invalid date found in backup for transaction:', tx.id);
                        dateVal = new Date();
                    }

                    await Database.addTransaction({
                        ...tx,
                        date: dateVal
                    });
                }
            }

            const categories = getAsArray(data.categories);
            if (categories) {
                console.log(`Processing ${categories.length} categories...`);
                for (const cat of categories) {
                    await Database.addCategory(cat);
                }
            }

            const chatHistory = getAsArray(data.chatHistory);
            if (chatHistory) {
                console.log(`Processing ${chatHistory.length} chat messages...`);
                await Database.clearChatHistory();
                for (const msg of chatHistory) {
                    await Database.addChatMessage(msg);
                }
            }

            // Mark as migrated so it doesn't try to seed defaults on next restart
            await Database.setMetadata('migrated_v1', 'true');
            console.log('Restore completed successfully!');

            Alert.alert('Success', 'Data restored successfully!', [
                {
                    text: 'OK',
                    onPress: () => {
                        if (onSuccess) onSuccess();
                    }
                }
            ]);
        } catch (error: any) {
            console.error('Restore error:', error);
            Alert.alert('Restore Failed', error.message);
        }
    },

    deleteBackup: async () => {
        try {
            const user = auth.currentUser;
            if (!user) {
                Alert.alert('Login Required', 'Please log in to delete your backup.');
                return;
            }

            const backupRef = doc(db, 'users', user.uid, 'backups', 'latest');
            const docSnap = await getDoc(backupRef);

            if (!docSnap.exists()) {
                Alert.alert('No Backup Found', 'There is no backup to delete.');
                return;
            }

            Alert.alert(
                'Delete Backup',
                'Are you sure you want to delete your cloud backup? This will not affect your local data.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                            await deleteDoc(backupRef);
                            Alert.alert('Deleted', 'Cloud backup has been removed.');
                        }
                    }
                ]
            );
        } catch (error: any) {
            console.error('Delete backup error:', error);
            Alert.alert('Error', error.message);
        }
    }
};
