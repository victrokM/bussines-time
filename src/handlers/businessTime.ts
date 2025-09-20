import { APIGatewayProxyHandler } from 'aws-lambda';
import { DateTime } from 'luxon';
import { BusinessClock } from '../logic/businessTime';
import { HttpHolidays } from '../logic/holidays';

export const handler: APIGatewayProxyHandler = async (event) => {
  const { days, hours, date } = event.queryStringParameters || {};

  if (!days && !hours) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'InvalidParameters',
        message: 'Provide ?days or ?hours',
      }),
    };
  }

  const clock = new BusinessClock({ holidays: new HttpHolidays() });
  const utcInput = date ? DateTime.fromISO(date, { zone: 'utc' }) : undefined;

  const localResult = await clock.compute({
    utcInput,
    days: Number(days ?? 0),
    hours: Number(hours ?? 0),
  });

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: localResult.toUTC().toISO({ suppressMilliseconds: true }),
    }),
  };
};
