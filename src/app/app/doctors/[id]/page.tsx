"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPost } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { ICONS } from "@/components/ui/Icon";
import { Star, StarRow } from "@/components/ui/StarRating";
import { GuestGate } from "@/components/auth/GuestGate";
import { useAuth } from "@/context/AuthContext";
import {
  Doctor,
  DoctorAvailability,
  FamilyMember,
  Review,
  WEEKDAYS,
  WEEKDAY_BY_JS_DAY,
  doctorFullName,
  doctorImageUrl,
  formatKobo,
} from "@/lib/types";


interface BookedSlot {
  scheduledAt: string;
  duration: number;
}

const CONSULTATION_TYPES: { value: "video" | "audio" | "chat"; label: string }[] = [
  { value: "video", label: "Video call" },
  { value: "audio", label: "Voice call" },
  { value: "chat", label: "Chat" },
];

const DEFAULT_SLOT_DURATION_MINUTES = 30;

function nextNDays(n: number): Date[] {
  const days: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

// Mirrors the mobile app's BookAppointmentScreen availability logic exactly:
// a doctor with no `availability` configured at all is treated as fully open
// (free time picker, any day); once they've set a schedule, only the days
// they've configured are bookable, at their exact hours and slot length.
function hasAnyAvailability(availability?: DoctorAvailability): boolean {
  if (!availability) return false;
  return WEEKDAYS.some((d) => availability[d]?.from && availability[d]?.to);
}

function getDayAvailability(
  date: Date,
  availability?: DoctorAvailability
): { from: string; to: string; slotDuration: number } | null {
  if (!availability) return null;
  const slot = availability[WEEKDAY_BY_JS_DAY[date.getDay()]];
  if (!slot?.from || !slot?.to) return null;
  return { from: slot.from, to: slot.to, slotDuration: availability.slotDuration ?? DEFAULT_SLOT_DURATION_MINUTES };
}

function generateTimeStrings(from: string, to: string, slotMinutes: number): string[] {
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  const start = fh * 60 + fm;
  const end = th * 60 + tm;
  const out: string[] = [];
  for (let t = start; t < end; t += slotMinutes) {
    out.push(`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`);
  }
  return out;
}

function combineDateAndTime(day: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d;
}

export default function DoctorDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const doctorId = params.id;
  const { isAnonymous } = useAuth();

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const days = useMemo(() => nextNDays(7), []);
  const [selectedDay, setSelectedDay] = useState<Date>(days[0]);
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [freeTime, setFreeTime] = useState("");
  const [consultationType, setConsultationType] = useState<"video" | "audio" | "chat">("video");
  const [reason, setReason] = useState("");
  const [shareUserInfo, setShareUserInfo] = useState(true);

  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);

  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<string[] | null>(null);
  const [feeLabel, setFeeLabel] = useState("...");
  const [paymentEnabled, setPaymentEnabled] = useState(false);

  useEffect(() => {
    apiGet<{
      success: boolean;
      data?: { consultationFeeKobo: number; currency: string; paymentEnabled: boolean };
    }>("/api/platform-settings").then(({ data }) => {
      if (data.success && data.data) {
        setFeeLabel(formatKobo(data.data.consultationFeeKobo, data.data.currency));
        setPaymentEnabled(data.data.paymentEnabled);
      } else {
        setFeeLabel("—");
      }
    });
  }, []);

  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  function loadReviews() {
    apiGet<{ success: boolean; data?: { reviews: Review[]; total: number } }>(
      `/api/reviews/doctor/${doctorId}?limit=10`
    ).then(({ data }) => {
      if (data.success && data.data) {
        setReviews(data.data.reviews);
        setReviewsTotal(data.data.total);
      }
    });
  }

  useEffect(() => {
    loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId]);

  useEffect(() => {
    if (isAnonymous) return;
    apiGet<{ success: boolean; data?: { canReview: boolean } }>(`/api/reviews/can-review/${doctorId}`).then(
      ({ data }) => {
        if (data.success && data.data) setCanReview(data.data.canReview);
      }
    );
  }, [doctorId, isAnonymous]);

  async function handleSubmitReview() {
    setSubmittingReview(true);
    setReviewError(null);

    const { data } = await apiPost<{
      success: boolean;
      message?: string;
      data?: { newAvgRating: number };
    }>("/api/reviews", { doctorId, rating: reviewRating, comment: reviewComment.trim() || undefined });

    setSubmittingReview(false);

    if (!data.success) {
      setReviewError(data.message ?? "Could not submit your review.");
      return;
    }

    setShowReviewModal(false);
    setCanReview(false);
    setReviewComment("");
    setReviewRating(5);
    loadReviews();
    if (data.data && doctor) setDoctor({ ...doctor, ratings: data.data.newAvgRating });
  }

  useEffect(() => {
    // Viewing an approved doctor's profile is guest-browsable (matches the
    // backend's GET /doctors/:id, which only requires guestAuth) — only the
    // actual booking action below is gated behind a real account.
    apiGet<{ success: boolean; data?: Doctor; message?: string }>(`/api/doctors/${doctorId}`).then(({ data }) => {
      if (data.success && data.data) {
        setDoctor(data.data);
      } else {
        setLoadError(data.message ?? "Could not load this doctor's profile.");
      }
    });
  }, [doctorId]);

  useEffect(() => {
    if (isAnonymous) return;
    apiGet<{ success: boolean; data?: FamilyMember[] }>("/api/family").then(({ data }) => {
      if (data.success && data.data) setFamilyMembers(data.data);
    });
  }, [isAnonymous]);

  useEffect(() => {
    setSlotsLoading(true);
    setSelectedTime(null);
    setFreeTime("");
    const from = new Date(selectedDay);
    from.setHours(0, 0, 0, 0);
    const to = new Date(selectedDay);
    to.setHours(23, 59, 59, 999);

    apiGet<{ success: boolean; data?: BookedSlot[] }>(
      `/api/appointments/booked-slots?doctorId=${doctorId}&from=${from.toISOString()}&to=${to.toISOString()}`
    )
      .then(({ data }) => setBookedSlots(data.data ?? []))
      .finally(() => setSlotsLoading(false));
  }, [doctorId, selectedDay]);

  const scheduleIsConfigured = hasAnyAvailability(doctor?.availability);
  const dayInfo = getDayAvailability(selectedDay, doctor?.availability);

  const now = new Date();
  const daySlots = useMemo(() => {
    if (!dayInfo) return [];
    return generateTimeStrings(dayInfo.from, dayInfo.to, dayInfo.slotDuration).filter(
      (hhmm) => combineDateAndTime(selectedDay, hhmm) > now
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayInfo, selectedDay]);

  const isSlotBooked = (hhmm: string) => {
    const slotStart = combineDateAndTime(selectedDay, hhmm).getTime();
    return bookedSlots.some((b) => {
      const bookedStart = new Date(b.scheduledAt).getTime();
      const bookedEnd = bookedStart + b.duration * 60_000;
      return slotStart >= bookedStart && slotStart < bookedEnd;
    });
  };

  const effectiveDuration = dayInfo?.slotDuration ?? DEFAULT_SLOT_DURATION_MINUTES;

  // Mirrors the mobile app's BookAppointmentScreen exactly: when booking for
  // a family member, their health context is prepended into `notes` (not
  // `reason`) as "[For: Name (Relationship)] | Blood: X | Allergies: Y | ...".
  function composeNotes(): string | undefined {
    if (!selectedMember) return undefined;
    const parts = [`[For: ${selectedMember.name} (${selectedMember.relationship})]`];
    if (selectedMember.bloodGroup) parts.push(`Blood: ${selectedMember.bloodGroup}`);
    if (selectedMember.allergies) parts.push(`Allergies: ${selectedMember.allergies}`);
    if (selectedMember.notes) parts.push(selectedMember.notes);
    return parts.join(" | ");
  }

  async function handleBook() {
    if (!selectedTime) return;
    setBooking(true);
    setBookError(null);
    setMissingFields(null);

    const { status, data } = await apiPost<{
      success: boolean;
      message?: string;
      code?: string;
      missingFields?: string[];
      data?: { _id: string };
    }>("/api/appointments", {
      doctorId,
      scheduledAt: combineDateAndTime(selectedDay, selectedTime).toISOString(),
      duration: effectiveDuration,
      consultationType,
      reason: reason.trim() || undefined,
      notes: composeNotes(),
      shareUserInfo,
    });

    if (status === 422 && data.code === "PROFILE_INCOMPLETE") {
      setBooking(false);
      setMissingFields(data.missingFields ?? []);
      return;
    }
    if (status === 401) {
      setBooking(false);
      router.push("/login");
      return;
    }
    if (!data.success || !data.data) {
      setBooking(false);
      setBookError(data.message ?? "Could not book this appointment.");
      return;
    }

    if (!paymentEnabled) {
      // Payment is temporarily disabled server-side — the appointment above
      // already landed as "pending" and the doctor's already been notified.
      // The appointment detail page is the real confirmation; no separate
      // success screen needed.
      router.push(`/app/appointments/${data.data._id}`);
      return;
    }

    // Reservation made — now start payment and send the browser to the
    // provider's hosted checkout. Full-page redirect (web's equivalent of
    // mobile's in-app browser), returning to a dedicated callback page.
    const redirectUrl = `${window.location.origin}/app/appointments/${data.data._id}/payment-callback`;
    const { data: paymentData } = await apiPost<{
      success: boolean;
      message?: string;
      data?: { authorizationUrl: string };
    }>(`/api/appointments/${data.data._id}/payment/initiate`, { redirectUrl });

    setBooking(false);

    if (!paymentData.success || !paymentData.data) {
      setBookError(paymentData.message ?? "Could not start payment for this appointment.");
      return;
    }

    window.location.href = paymentData.data.authorizationUrl;
  }

  if (loadError) {
    return (
      <div>
        <p className="text-sm text-red-600">{loadError}</p>
        <Link href="/app/doctors" className="mt-4 inline-block text-sm font-semibold text-primary">
          &larr; Back to doctors
        </Link>
      </div>
    );
  }

  if (!doctor) {
    return <p className="text-sm text-muted">Loading doctor profile...</p>;
  }

  const imageUrl = doctorImageUrl(doctor);

  return (
    <div>
      <Link href="/app/doctors" className="text-sm font-semibold text-primary">
        &larr; Back to doctors
      </Link>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="rounded-card bg-card-bg shadow-atmospheric p-6">
            <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-full bg-accent-pink-bg">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt={doctorFullName(doctor)} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-primary">
                  {doctor.firstName[0]}
                  {doctor.lastName[0]}
                </div>
              )}
            </div>
            <h1 className="mt-4 text-center text-lg font-black text-heading">{doctorFullName(doctor)}</h1>
            <p className="text-center text-sm text-muted">{doctor.specialization}</p>
            {typeof doctor.ratings === "number" && doctor.ratings > 0 && (
              <p className="mt-1 text-center text-sm font-semibold text-secondary">★ {doctor.ratings.toFixed(1)}</p>
            )}
            {doctor.yearsOfExperience ? (
              <p className="mt-3 text-center text-xs text-muted">{doctor.yearsOfExperience} years of experience</p>
            ) : null}
            {doctor.bio && <p className="mt-4 text-sm text-body">{doctor.bio}</p>}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-card bg-card-bg shadow-atmospheric p-6">
            <h2 className="font-bold text-heading">Book an appointment</h2>

            {missingFields && missingFields.length > 0 && (
              <div className="mt-3 rounded-lg border border-secondary bg-accent-amber-bg p-3 text-sm text-heading">
                <p className="font-semibold">Please complete your profile first:</p>
                <ul className="mt-1 list-inside list-disc">
                  {missingFields.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <Link href="/app/profile" className="mt-2 inline-block font-semibold text-primary">
                  Go to profile &rarr;
                </Link>
              </div>
            )}

            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold text-heading">Day</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {days.map((d) => {
                  const active = d.toDateString() === selectedDay.toDateString();
                  const dayAvailable = !scheduleIsConfigured || getDayAvailability(d, doctor.availability) !== null;
                  return (
                    <button
                      key={d.toISOString()}
                      disabled={!dayAvailable}
                      onClick={() => setSelectedDay(d)}
                      className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                        active
                          ? "border-primary bg-primary text-white"
                          : "border-border bg-input-bg text-body hover:border-primary"
                      }`}
                    >
                      {d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold text-heading">Available times</p>
              {slotsLoading ? (
                <p className="text-sm text-muted">Loading available times...</p>
              ) : scheduleIsConfigured ? (
                dayInfo ? (
                  <div className="flex flex-wrap gap-2">
                    {daySlots.length === 0 && <p className="text-sm text-muted">No more slots today.</p>}
                    {daySlots.map((hhmm) => {
                      const booked = isSlotBooked(hhmm);
                      const active = selectedTime === hhmm;
                      return (
                        <button
                          key={hhmm}
                          disabled={booked}
                          onClick={() => setSelectedTime(hhmm)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                            active
                              ? "border-primary bg-primary text-white"
                              : "border-border bg-input-bg text-body hover:border-primary"
                          }`}
                        >
                          {hhmm}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted">This doctor isn&apos;t available on this day.</p>
                )
              ) : (
                <div>
                  <Input
                    type="time"
                    value={freeTime}
                    onChange={(e) => {
                      setFreeTime(e.target.value);
                      setSelectedTime(e.target.value || null);
                    }}
                    className="w-auto"
                  />
                  <p className="mt-1 text-xs text-muted">
                    This doctor hasn&apos;t set fixed hours yet — pick any time that works for you.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold text-heading">Consultation type</p>
              <div className="flex gap-2">
                {CONSULTATION_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setConsultationType(t.value)}
                    className={`rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                      consultationType === t.value
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-input-bg text-body hover:border-primary"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {familyMembers.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold text-heading">Who is this for?</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedMember(null)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      selectedMember === null
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-input-bg text-body hover:border-primary"
                    }`}
                  >
                    Myself
                  </button>
                  {familyMembers.map((m) => (
                    <button
                      key={m._id}
                      onClick={() => setSelectedMember(m)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        selectedMember?._id === m._id
                          ? "border-primary bg-primary text-white"
                          : "border-border bg-input-bg text-body hover:border-primary"
                      }`}
                    >
                      {m.name.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4">
              <Textarea
                label="Reason for visit (optional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Briefly describe what you'd like to discuss"
              />
            </div>

            <label className="mt-3 flex items-center gap-2 text-xs text-body">
              <input
                type="checkbox"
                checked={shareUserInfo}
                onChange={(e) => setShareUserInfo(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              Share my profile info (name, contact, DOB) with this doctor
            </label>

            <div className="mt-4 flex items-center justify-between rounded-lg bg-accent-gray-bg px-3.5 py-2.5 text-sm">
              <span className="text-muted">Consultation fee</span>
              <span className="font-semibold text-heading">{feeLabel}</span>
            </div>

            {bookError && <p className="mt-3 text-sm text-red-600">{bookError}</p>}

            <GuestGate feature="Booking an appointment">
              <Button
                className="mt-5 w-full"
                disabled={!selectedTime}
                loading={booking}
                onClick={handleBook}
              >
                {selectedTime
                  ? paymentEnabled
                    ? `Continue to payment · ${feeLabel}`
                    : "Request Appointment"
                  : "Select a time to continue"}
              </Button>
            </GuestGate>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-card bg-card-bg shadow-atmospheric p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-heading">Reviews</h2>
            {typeof doctor.ratings === "number" && doctor.ratings > 0 ? (
              <div className="mt-1 flex items-center gap-2">
                <StarRow rating={doctor.ratings} size="h-4 w-4" />
                <span className="text-sm font-semibold text-heading">{doctor.ratings.toFixed(1)}</span>
                <span className="text-sm text-muted">
                  ({reviewsTotal} review{reviewsTotal === 1 ? "" : "s"})
                </span>
              </div>
            ) : (
              <p className="mt-1 text-sm text-muted">No reviews yet.</p>
            )}
          </div>
          {canReview && (
            <Button variant="outline" onClick={() => setShowReviewModal(true)}>
              Write a review
            </Button>
          )}
        </div>

        {reviews === null && <p className="mt-4 text-sm text-muted">Loading reviews...</p>}
        {reviews && reviews.length === 0 && (
          <p className="mt-4 text-sm text-muted">Be the first to review {doctorFullName(doctor)}.</p>
        )}

        {reviews && reviews.length > 0 && (
          <div className="mt-4 flex flex-col gap-4">
            {(showAllReviews ? reviews : reviews.slice(0, 3)).map((r) => (
              <div key={r._id} className="border-t border-border pt-4 first:border-t-0 first:pt-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-heading">{r.name}</p>
                  <p className="text-xs text-muted">{new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
                <StarRow rating={r.rating} size="h-3.5 w-3.5" />
                {r.comment && <p className="mt-1.5 text-sm text-body">{r.comment}</p>}
              </div>
            ))}
            {reviews.length > 3 && (
              <button
                onClick={() => setShowAllReviews((v) => !v)}
                className="w-fit text-sm font-semibold text-primary hover:underline"
              >
                {showAllReviews ? "Show less" : `Show all ${reviews.length} reviews`}
              </button>
            )}
          </div>
        )}
      </div>

      <Modal open={showReviewModal} onClose={() => setShowReviewModal(false)} title={`Review ${doctorFullName(doctor)}`}>
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold text-heading">Your rating</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setReviewRating(n)} aria-label={`${n} star${n === 1 ? "" : "s"}`}>
                  <Star filled={n <= reviewRating} className="h-7 w-7 text-secondary" />
                </button>
              ))}
            </div>
          </div>
          <Textarea
            label="Comment (optional)"
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            rows={3}
            placeholder="Share how your consultation went"
          />
          {reviewError && <p className="text-sm text-red-600">{reviewError}</p>}
          <Button loading={submittingReview} onClick={handleSubmitReview} className="w-full">
            Submit review
          </Button>
        </div>
      </Modal>
    </div>
  );
}
