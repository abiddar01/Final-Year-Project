import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { booking_id, action, rejection_reason } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get booking details with car info
    const { data: booking, error: bookingErr } = await supabase
      .from("test_drive_bookings")
      .select("*, cars(name, brand)")
      .eq("id", booking_id)
      .single();

    if (bookingErr || !booking) {
      throw new Error("Booking not found");
    }

    let newStatus: string;
    let subject: string;
    let message: string;

    if (action === "confirm_submission") {
      // Initial submission confirmation to customer
      newStatus = "pending";
      subject = "Test Drive Booking Received - Elegance Wheels";
      message = `Dear ${booking.full_name},\n\nThank you for booking a test drive with Elegance Wheels!\n\nBooking Details:\n- Vehicle: ${booking.cars?.name || "N/A"} (${booking.cars?.brand || ""})\n- Date: ${booking.preferred_date}\n- Time: ${booking.preferred_time}\n\nYour booking is currently under review. We will notify you once it has been approved.\n\nBest regards,\nElegance Wheels Team`;
    } else if (action === "approve") {
      newStatus = "approved";
      subject = "Test Drive Approved! - Elegance Wheels";
      message = `Dear ${booking.full_name},\n\nGreat news! Your test drive booking has been approved.\n\nConfirmed Details:\n- Vehicle: ${booking.cars?.name || "N/A"} (${booking.cars?.brand || ""})\n- Date: ${booking.preferred_date}\n- Time: ${booking.preferred_time}\n\nPlease arrive 10 minutes before your scheduled time. Bring a valid driving license and your CNIC.\n\nBest regards,\nElegance Wheels Team`;

      await supabase
        .from("test_drive_bookings")
        .update({ status: "approved" })
        .eq("id", booking_id);
    } else if (action === "reject") {
      newStatus = "rejected";
      subject = "Test Drive Booking Update - Elegance Wheels";
      const reason = rejection_reason || "Unfortunately, we are unable to accommodate your requested time slot.";
      message = `Dear ${booking.full_name},\n\nWe regret to inform you that your test drive booking could not be approved at this time.\n\nReason: ${reason}\n\nVehicle: ${booking.cars?.name || "N/A"}\nRequested Date: ${booking.preferred_date}\nRequested Time: ${booking.preferred_time}\n\nWe encourage you to book another slot at your convenience.\n\nBest regards,\nElegance Wheels Team`;

      await supabase
        .from("test_drive_bookings")
        .update({ status: "rejected", rejection_reason: rejection_reason || null })
        .eq("id", booking_id);
    } else {
      throw new Error("Invalid action");
    }

    // Log the notification
    await supabase.from("notification_log").insert({
      booking_id,
      type: "email",
      recipient: booking.email,
      subject,
      message,
      status: "sent",
    });

    return new Response(
      JSON.stringify({ success: true, message: `Notification sent to ${booking.email}`, subject }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
