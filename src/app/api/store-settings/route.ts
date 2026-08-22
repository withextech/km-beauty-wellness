import { getHomepageCms } from "../../lib/store-data";

export async function GET() {
  const settings = await getHomepageCms();
  return Response.json({
    contact_address: settings.contact_address,
    contact_email: settings.contact_email,
    contact_phone: settings.contact_phone,
    delivery_fees: settings.delivery_fees,
  });
}
