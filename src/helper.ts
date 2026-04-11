import sql from "./db";

export interface ProcessedData {
  id: string;
  bot_name: string;
  link: string;
  click_count: number;
  timestamp: number;
}

export interface TicketData {
  dateTime: string;
  category: string;
  section: string;
  row: string;
  seatNo: string;
  quantity: number;
  pricePerTicket: number;
  totalPrice: number;
  email: string;
  bookingRef: string;
}

const formatter = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
});

function processSBData(data: any): ProcessedData {
  const link = data.embeds[0].url;

  return {
    id: crypto.randomUUID(),
    bot_name: "SecuredBot",
    link,
    click_count: 0,
    timestamp: Date.now(),
  };
}

function processOWData(data: any): ProcessedData {
  const link = data.embeds[0].fields[0].value;

  return {
    id: crypto.randomUUID(),
    bot_name: "OW",
    link,
    click_count: 0,
    timestamp: Date.now(),
  };
}

async function processTKTData(data: any): Promise<ProcessedData> {
  const id = crypto.randomUUID();
  const fields = data.embeds[0].fields;
  const proxy = fields[4].value.split("||")[1];
  const link = fields[6].value.split("||")[1];
  const timestamp = Date.now();

  await sql`INSERT INTO "Logs" (bot, proxy, timestamp) VALUES (${"TKT"}, ${proxy}, ${new Date(timestamp).toISOString()})`;

  return {
    id,
    bot_name: "TKT",
    link,
    click_count: 0,
    timestamp,
  };
}

async function processTSplashData(data: any): Promise<ProcessedData> {
  const link = data.embeds[0].url;
  const proxy = data.embeds[0].fields[4].value.split("||")[1];

  await sql`INSERT INTO "Logs" (bot, proxy, timestamp) VALUES (${"T-Splash"}, ${proxy}, ${new Date(Date.now()).toISOString()})`;

  return {
    id: crypto.randomUUID(),
    bot_name: "T-Splash",
    link,
    click_count: 0,
    timestamp: Date.now(),
  };
}

export async function insertTicket(ticket: TicketData) {
  const {
    dateTime,
    category,
    section,
    row,
    seatNo,
    quantity,
    pricePerTicket,
    totalPrice,
    email,
    bookingRef,
  } = ticket;

  await sql`INSERT INTO "Tickets" (date_time, category, section, row, seat_no, quantity, price_per_ticket, total_price, email, booking_ref) VALUES (${dateTime}, ${category}, ${section}, ${row}, ${seatNo}, ${quantity}, ${pricePerTicket}, ${totalPrice}, ${email}, ${bookingRef})`;
}

export async function processData(data: any): Promise<ProcessedData | null> {
  const title = data.embeds?.[0]?.title;

  switch (title) {
    case "Queue Passed!":
      return processSBData(data);
    case "PASSED QUEUE":
      return processOWData(data);
    case "--Queue SUCCESS--":
      return await processTKTData(data);
    case "Exported Link":
      return processTSplashData(data);
    default:
      return null;
  }
}
