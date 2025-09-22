const BASE_URL =
  "https://m33lkis2x8.execute-api.us-east-1.amazonaws.com/prod/business-time";

interface TestCase {
  name: string;
  query: string;
  expected: string;
}

const cases: TestCase[] = [
  { name: "1. Viernes 5pm +1h", query: "?hours=1&date=2025-08-29T22:00:00Z", expected: "2025-09-01T14:00:00Z" },
  { name: "2. Sábado 2pm +1h", query: "?hours=1&date=2025-08-30T19:00:00Z", expected: "2025-09-01T14:00:00Z" },
  { name: "3. Martes 3pm +1d +4h", query: "?days=1&hours=4&date=2025-08-26T20:00:00Z", expected: "2025-08-28T15:00:00Z" },
  { name: "4. Domingo 6pm +1d", query: "?days=1&date=2025-08-24T23:00:00Z", expected: "2025-08-25T22:00:00Z" },
  { name: "5. Lunes 8am +8h", query: "?hours=8&date=2025-08-25T13:00:00Z", expected: "2025-08-25T22:00:00Z" },
  { name: "6. Lunes 8am +1d", query: "?days=1&date=2025-08-25T13:00:00Z", expected: "2025-08-26T13:00:00Z" },
  { name: "7. Lunes 12:30pm +1d", query: "?days=1&date=2025-08-25T17:30:00Z", expected: "2025-08-26T17:00:00Z" },
  { name: "8. Lunes 11:30am +3h", query: "?hours=3&date=2025-08-25T16:30:00Z", expected: "2025-08-25T20:30:00Z" },
  { name: "9. Festivos 10 abril +5d +4h", query: "?days=5&hours=4&date=2025-04-10T15:00:00.000Z", expected: "2025-04-21T20:00:00Z" },
];

describe("BusinessTime API E2E", () => {
  test.each(cases)("$name", async ({ query, expected }) => {
    const res = await fetch(`${BASE_URL}${query}`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { date: string };
    console.log(`${query} -> got ${data.date}, expected ${expected}`);
    expect(data.date).toBe(expected);
  });
});
