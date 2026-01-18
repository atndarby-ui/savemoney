import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications behave when the app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => {
        console.log('[NotificationService] Incoming notification in foreground...');
        return {
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
        };
    },
});

// Response listener to handle buttons
Notifications.addNotificationResponseReceivedListener(async response => {
    const actionId = response.actionIdentifier;
    const goalId = response.notification.request.content.data?.goalId;

    if (actionId === 'stop' && goalId) {
        console.log('[NotificationService] Action: Stop for Goal:', goalId);
        // This stops current sound (system level) and we can potentially clear future ones
        // But we need the list of IDs... maybe easier to just clear all scheduled?
        // For now, let's just log. Clearing specific IDs requires database access or storage.
    } else if (actionId === 'done' && goalId) {
        console.log('[NotificationService] Action: Done for Goal:', goalId);
        // Mark goal as completed in storage?
    }
});

export const NotificationService = {
    checkPermissions: async () => {
        const { status } = await Notifications.getPermissionsAsync();
        return status;
    },

    registerForPushNotificationsAsync: async () => {
        let token;

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'Nhắc nhở', // User friendly name
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
                lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC, // Show content on lock screen
                bypassDnd: true, // High priority
                sound: 'default',
            });
        }

        // Define Actions
        await Notifications.setNotificationCategoryAsync('reminder', [
            {
                identifier: 'stop',
                buttonTitle: 'Tắt chuông',
                options: { isDestructive: true },
            },
            {
                identifier: 'done',
                buttonTitle: 'Đã xong',
                options: { isAuthenticationRequired: false },
            },
            {
                identifier: 'snooze',
                buttonTitle: 'Nhắc lại sau 5p',
                options: { isAuthenticationRequired: false },
            }
        ]);

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            return null;
        }

        return true;
    },

    scheduleReminder: async (
        title: string,
        body: string,
        triggerDate: Date,
        soundUri?: string,
        imageUri?: string,
        categoryIdentifier: string = 'reminder',
        repeats: boolean = false,
        goalId?: string
    ): Promise<string> => {
        // Request permissions first
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
            const { status: newStatus } = await Notifications.requestPermissionsAsync();
            if (newStatus !== 'granted') {
                console.warn('[NotificationService] Permissions not granted for notifications.');
                return '';
            }
        }

        if (!triggerDate || isNaN(triggerDate.getTime())) {
            console.error('[NotificationService] scheduleReminder received an invalid date object.');
            return '';
        }
        const triggerMillis = triggerDate.getTime() - Date.now();
        console.log(`[NotificationService] Scheduling "${title}" in ${Math.round(triggerMillis / 1000)}s (${triggerDate.toLocaleString()}) - Category: ${categoryIdentifier}, Repeats: ${repeats}, Goal: ${goalId}`);

        if (triggerMillis <= 0 && !repeats) {
            console.warn('[NotificationService] Trigger date is in the past and not repeating, skipping.');
            return '';
        }

        const content: Notifications.NotificationContentInput = {
            title,
            body,
            sound: true,
            data: { imageUri, goalId },
            categoryIdentifier,
            attachments: imageUri ? [{ url: imageUri, identifier: 'image' } as any] : [],
        };

        if (soundUri) {
            console.log('[NotificationService] Using custom sound:', soundUri);
            content.sound = soundUri;
        }

        // Attach image if provided (Note: Native implementation for attachments varies)
        if (imageUri && Platform.OS === 'ios') {
            content.attachments = [{
                uri: imageUri,
                identifier: 'reminder-image',
                type: 'image'
            } as any];
        }

        try {
            let trigger: any;

            if (repeats) {
                if (Platform.OS === 'android') {
                    // Android does not support 'calendar' trigger. Use 'daily' for basic repeats.
                    trigger = {
                        type: Notifications.SchedulableTriggerInputTypes.DAILY,
                        hour: triggerDate.getHours(),
                        minute: triggerDate.getMinutes(),
                        channelId: 'default',
                    };
                    console.log('[NotificationService] Using DAILY trigger for Android repeat');
                } else {
                    trigger = {
                        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
                        hour: triggerDate.getHours(),
                        minute: triggerDate.getMinutes(),
                        repeats: true,
                    };
                }
            } else {
                if (Platform.OS === 'android') {
                    // For Android, even for one-time, we can use DATE or TIME_INTERVAL
                    // But to specify channelId, we might need object format
                    trigger = {
                        type: Notifications.SchedulableTriggerInputTypes.DATE,
                        date: triggerDate,
                        channelId: 'default',
                    };
                } else {
                    trigger = {
                        type: Notifications.SchedulableTriggerInputTypes.DATE,
                        date: triggerDate,
                    };
                }
            }

            const id = await Notifications.scheduleNotificationAsync({
                content,
                trigger,
            });
            console.log('[NotificationService] Scheduled successfully. ID:', id);
            return id;
        } catch (error) {
            console.error('[NotificationService] Error scheduling notification:', error);
            return '';
        }
    },

    cancelNotification: async (id: string) => {
        try {
            if (!id) return;
            const ids = id.split(',');
            for (const notifId of ids) {
                console.log('[NotificationService] Canceling scheduled notification:', notifId);
                await Notifications.cancelScheduledNotificationAsync(notifId);
            }
        } catch (error) {
            console.error("[NotificationService] Error canceling notification:", error);
        }
    },

    cancelAll: async () => {
        await Notifications.cancelAllScheduledNotificationsAsync();
    },

    // Helper to calculate trigger date
    // offsetMinutes: how many minutes BEFORE the deadline to notify
    calculateTriggerDate: (deadlineStr: string, offsetMinutes: number): Date | null => {
        // 1. Try DD/MM/YYYY format
        const parts = deadlineStr.split('/');
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            const deadline = new Date(year, month, day);
            deadline.setHours(9, 0, 0, 0); // Default to 9:00 AM
            if (!isNaN(deadline.getTime())) {
                return new Date(deadline.getTime() - offsetMinutes * 60000);
            }
        }

        // 2. Try ISO or other formats
        const d = new Date(deadlineStr);
        if (!isNaN(d.getTime())) {
            return new Date(d.getTime() - offsetMinutes * 60000);
        }

        console.warn('[NotificationService] calculateTriggerDate received an invalid date string:', deadlineStr);
        return null;
    }
};
