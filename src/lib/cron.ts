import { CronExpressionParser } from "cron-parser";

export function nextCronDate(cron: string, from = new Date()) {
  const expression = CronExpressionParser.parse(cron, {
    currentDate: from,
  });
  return expression.next().toDate();
}

export function frequencyToCron(frequency: string, time: string) {
  const [rawHour, rawMinuteAndPeriod] = time.split(":");
  const [rawMinute, period] = (rawMinuteAndPeriod ?? "00 AM").split(" ");
  let hour = Number(rawHour);
  const minute = Number(rawMinute);
  if (period?.toUpperCase() === "PM" && hour < 12) hour += 12;
  if (period?.toUpperCase() === "AM" && hour === 12) hour = 0;

  switch (frequency) {
    case "every_day":
      return `${minute} ${hour} * * *`;
    case "weekdays":
    case "every_weekday":
      return `${minute} ${hour} * * 1-5`;
    case "weekly":
      return `${minute} ${hour} * * 1`;
    case "twice_week":
      return `${minute} ${hour} * * 1,4`;
    default:
      return `${minute} ${hour} * * 1-5`;
  }
}

/** Vercel Hobby only allows schedules that fire at most once per day. */
export function isHobbyCompatibleCron(schedule: string) {
  const parts = schedule.trim().split(/\s+/);
  if (parts.length < 5) return false;
  const [minute, hour] = parts;
  return /^\d+$/.test(minute) && /^\d+$/.test(hour);
}

export function describeCron(cron: string) {
  const parts = cron.split(" ");
  if (parts.length < 5) return cron;
  const [minute, hour, , , dow] = parts;
  const hourNum = Number(hour);
  const period = hourNum >= 12 ? "PM" : "AM";
  const displayHour = ((hourNum + 11) % 12) + 1;
  const time = `${String(displayHour).padStart(2, "0")}:${minute.padStart(2, "0")} ${period}`;
  if (dow === "1-5") return `Weekdays at ${time}`;
  if (dow === "*") return `Every day at ${time}`;
  if (dow === "1") return `Mondays at ${time}`;
  if (dow === "1,4") return `Mondays and Thursdays at ${time}`;
  return `${cron} (${time})`;
}
