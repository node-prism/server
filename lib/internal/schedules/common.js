export const CRON = {
    DAILY: {
        MIDNIGHT: "0 0 * * *",
        NOON: "0 0 12 * *",
    },
    WEEKLY: {
        SUNDAY: "0 0 * * 0",
        MONDAY: "0 0 * * 1",
        TUESDAY: "0 0 * * 2",
        WEDNESDAY: "0 0 * * 3",
        THURSDAY: "0 0 * * 4",
        FRIDAY: "0 0 * * 5",
        SATURDAY: "0 0 * * 6",
    },
    EVERY: {
        MINUTE: "* * * * *",
        HOUR: "0 * * * *",
        DAY: "0 0 * * *",
        WEEK: "0 0 * * 0",
        MONTH: "0 0 1 * *",
    },
};
//# sourceMappingURL=common.js.map