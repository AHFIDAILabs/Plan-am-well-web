export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

// Indexed to match JS Date.getDay() (0 = Sunday), for looking up a specific
// calendar date's availability entry — distinct from WEEKDAYS above, which is
// Monday-first for display order in the availability editor.
export const WEEKDAY_BY_JS_DAY: Weekday[] = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export type DoctorAvailability = Partial<Record<Weekday, { available?: boolean; from: string; to: string }>> & {
  slotDuration?: number;
};

export interface Doctor {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  doctorImage?: { imageUrl: string } | string | null;
  profileImage?: string;
  specialization: string;
  licenseNumber?: string;
  yearsOfExperience?: number;
  bio?: string;
  contactNumber?: string;
  ratings?: number;
  reviewCount?: number;
  reviews?: Array<{ userId: string; rating: number; comment: string }>;
  status: "submitted" | "reviewing" | "approved" | "rejected";
  availability?: DoctorAvailability;
  // ISO string — computed server-side (backend/src/services/doctorAvailability.ts),
  // never cached alongside the rest of the doctor profile since it depends
  // on live booking state. Null means nothing opens up in the lookahead window.
  nextAvailable?: string | null;
}

export function doctorImageUrl(doctor: Pick<Doctor, "doctorImage" | "profileImage">): string | null {
  const img = doctor.doctorImage;
  if (img && typeof img === "object" && "imageUrl" in img) return img.imageUrl;
  // Doctor.profileImage is a separate plain-string field on the model (older/
  // seed-created doctors), distinct from the doctorImage Cloudinary ref real
  // signups populate — check it as a fallback so both sources render a photo.
  if (doctor.profileImage) return doctor.profileImage;
  return null;
}

export function doctorFullName(doctor: Pick<Doctor, "firstName" | "lastName">): string {
  return `Dr. ${doctor.firstName} ${doctor.lastName}`;
}

// Real, server-computed next open slot (backend/src/services/doctorAvailability.ts).
export function formatNextAvailable(iso?: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  const now = new Date();
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();
  if (isToday) return `Today, ${time}`;
  if (isTomorrow) return `Tomorrow, ${time}`;
  return `${date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}, ${time}`;
}

export function formatKobo(amountKobo: number, currency: string = "NGN"): string {
  const symbol = currency === "NGN" ? "₦" : `${currency} `;
  return `${symbol}${(amountKobo / 100).toLocaleString()}`;
}

export interface Review {
  _id: string;
  doctorId: string;
  userId: string;
  appointmentId?: string;
  name: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export type AppointmentStatus =
  | "awaiting-payment"
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "rejected"
  | "rescheduled"
  | "in-progress"
  | "expired"
  | "call-ended"
  | "confirmed-upcoming"
  | "about-to-start";

export interface Appointment {
  _id: string;
  doctorId: Pick<Doctor, "_id" | "firstName" | "lastName" | "specialization" | "doctorImage">;
  scheduledAt: string;
  duration: number;
  consultationType?: "video" | "in-person" | "chat" | "audio";
  status: AppointmentStatus;
  reason?: string;
  notes?: string;
  paymentStatus?: "pending" | "paid" | "failed";
  amountKobo?: number;
  currency?: string;
}

export interface ChatMessage {
  _id: string;
  senderId: string;
  senderType: "User" | "Doctor";
  messageType: "text" | "image" | "video" | "audio" | "system" | "document";
  content: string;
  mediaUrl?: string;
  status: "sent" | "delivered" | "read";
  createdAt: string;
  isEdited?: boolean;
  isDeleted?: boolean;
}

export interface ConversationParticipantUser {
  _id: string;
  name?: string;
  userImage?: { imageUrl: string } | string | null;
}

export function userImageUrl(user: Pick<ConversationParticipantUser, "userImage">): string | null {
  const img = user.userImage;
  if (img && typeof img === "object" && "imageUrl" in img) return img.imageUrl;
  return null;
}

export interface ConversationParticipantDoctor {
  _id: string;
  firstName: string;
  lastName: string;
  doctorImage?: { imageUrl: string } | string | null;
}

export interface Conversation {
  _id: string;
  appointmentId: string | { _id: string; scheduledAt: string; status: AppointmentStatus; callStatus?: string };
  participants: {
    userId: ConversationParticipantUser;
    doctorId: ConversationParticipantDoctor;
  };
  messages: ChatMessage[];
  lastMessage?: ChatMessage;
  unreadCount: { user: number; doctor: number };
  isActive: boolean;
  activeVideoRequest?: {
    _id: string;
    requestedBy: string;
    requestedByType: "User" | "Doctor";
    status: "pending" | "accepted" | "declined" | "expired" | "cancelled";
    callType: "audio" | "video";
    requestedAt: string;
    expiresAt: string;
  };
}

export interface Clinic {
  _id: string;
  name: string;
  type?: "public" | "private" | "NGO";
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  website?: string;
  openingHours?: string;
  specialties?: string[];
  services?: string[];
  amenity?: string;
  emergency?: boolean;
  coordinates?: { latitude: number; longitude: number };
  source: "openstreetmap";
}

export interface FamilyMember {
  _id: string;
  name: string;
  relationship: "Spouse" | "Child" | "Parent" | "Sibling" | "Other";
  gender?: "Male" | "Female" | "Other";
  dateOfBirth?: string;
  bloodGroup?: string;
  allergies?: string;
  notes?: string;
}

export interface MedicationReminder {
  _id: string;
  drugName: string;
  dosage: string;
  frequency: "once_daily" | "twice_daily" | "three_times_daily" | "four_times_daily" | "as_needed";
  times: string[];
  instructions?: string;
  color: string;
  isActive: boolean;
  startDate: string;
  endDate?: string;
  displayAlias?: string;
  takenToday?: boolean;
}

// Kept in sync by hand with backend/src/models/Event.ts's EVENT_BANNER_PRESETS.
export type EventBannerPreset = "support-circle" | "workshop" | "qa-session" | "wellness" | "celebration";

export interface CommunityEvent {
  _id: string;
  title: string;
  description: string;
  category?: string;
  startsAt: string;
  endsAt?: string;
  location?: string;
  isVirtual: boolean;
  capacity?: number;
  isActive: boolean;
  bannerImage?: { url: string; publicId?: string } | null;
  bannerPreset?: EventBannerPreset | null;
  // Aggregate count only — never attendee identities, matches the
  // confidentiality-first design of the rest of the app.
  rsvpCount?: number;
  // Only present on the single-event fetch, and only ever the viewer's own
  // RSVP — never anyone else's.
  myRsvp?: EventRsvp | null;
}

export interface EventRsvp {
  _id: string;
  eventId: string;
  userId: string;
  chosenName: string;
  reminderOptIn: boolean;
  status: "going" | "cancelled";
}

// GET /api/events/mine/rsvps populates eventId with the full event.
export type MyEventRsvp = Omit<EventRsvp, "eventId"> & { eventId: CommunityEvent };

export interface Partner {
  _id: string;
  name: string;
  socialLinks: string[];
  profession: string;
  businessAddress: string;
  partnerImage?: { imageUrl: string; url?: string } | null;
  partnerType: "individual" | "business";
  email?: string;
  phone?: string;
  description?: string;
  website?: string;
  isActive: boolean;
}

export function partnerImageUrl(partner: Pick<Partner, "partnerImage">): string | null {
  const img = partner.partnerImage;
  if (!img) return null;
  return img.imageUrl || img.url || null;
}

export interface AppNotification {
  _id: string;
  type:
    | "supplement"
    | "order"
    | "appointment"
    | "article"
    | "system"
    | "new_message"
    | "chat"
    | "call_ended"
    | "comment_flagged";
  title: string;
  message: string;
  isRead: boolean;
  metadata?: {
    appointmentId?: string;
    conversationId?: string;
    doctorName?: string;
    patientName?: string;
    otherPartyName?: string;
    scheduledAt?: string;
    [key: string]: unknown;
  };
  createdAt: string;
}

export interface VitalSigns {
  bloodPressure?: string;
  pulse?: string;
  temperature?: string;
  weight?: string;
  height?: string;
  bmi?: string;
  oxygenSaturation?: string;
}

export interface DiagnosisEntry {
  code?: string;
  description: string;
  severity?: "mild" | "moderate" | "severe";
}

export interface Prescription {
  drug: string;
  dosage: string;
  form: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface LabTest {
  name: string;
  result?: string;
  unit?: string;
  referenceRange?: string;
  status?: "normal" | "abnormal" | "pending";
}

export interface ConsultationNote {
  _id: string;
  appointmentId: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialization: string;
  doctorLicenseNumber: string;
  consultationDate: string;
  chiefComplaint: string;
  vitalSigns?: VitalSigns;
  diagnosis: DiagnosisEntry[];
  prescriptions: Prescription[];
  labTests: LabTest[];
  followUpInstructions?: string;
  followUpDate?: string;
  privateNotes?: string;
  attachments: { url: string; name: string; type: "image" | "pdf" | "other" }[];
  createdAt: string;
}

export interface MedicalRecord {
  _id: string;
  patientId: string;
  patientSnapshot: {
    name: string;
    email?: string;
    phone?: string;
    gender?: string;
    dateOfBirth?: string;
    bloodGroup?: string;
    allergies?: string[];
    homeAddress?: string;
  };
  consultationNotes: ConsultationNote[];
}

export interface AccessRequest {
  _id: string;
  patientId: string;
  requestingDoctorId: { _id: string; firstName: string; lastName: string; specialization: string; doctorImage?: { imageUrl: string } | string | null };
  appointmentId: string;
  status: "pending" | "approved" | "denied" | "expired";
  requestedAt: string;
  respondedAt?: string;
  expiresAt: string;
}

export type ArticleCategory = "all" | "educational" | "success-story" | "policy-brief" | "community-resource";

export interface Article {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  content?: string;
  category: ArticleCategory;
  tags: string[];
  author: { name: string; role?: string };
  featuredImage?: { url: string; alt?: string; caption?: string };
  readTime?: number;
  views: number;
  commentsCount: number;
  commentsEnabled: boolean;
  likes: number;
  publishedAt?: string;
  createdAt?: string;
  relatedArticles?: Pick<Article, "_id" | "title" | "slug" | "excerpt" | "featuredImage" | "category">[];
}

export interface ArticleComment {
  _id: string;
  articleId: string;
  userId?: string;
  author: { name: string; userId?: { _id: string; name?: string; userImage?: { imageUrl: string } | string | null } };
  content: string;
  parentCommentId?: string | null;
  status: "pending" | "approved" | "rejected" | "flagged";
  likes: number;
  likedBy: string[];
  isEdited: boolean;
  replies?: ArticleComment[];
  depth: number;
  createdAt: string;
}

export interface AppointmentPatientRef {
  _id: string;
  name?: string;
  email?: string;
}

export type DoctorAppointment = Omit<Appointment, "doctorId"> & { userId: AppointmentPatientRef };

export type ChatbotIntent = "health" | "buy" | "info" | "appointment" | "general" | "greeting";

export interface ChatbotProduct {
  _id: string;
  drugId?: string;
  name: string;
  imageUrl?: string;
  categoryName?: string;
  manufacturerName?: string;
  price: number;
  stockQuantity: number;
}

export interface ChatbotMessage {
  sender: "user" | "bot";
  text: string;
  intent?: ChatbotIntent;
  products?: ChatbotProduct[];
  timestamp: string;
  // Client-side only — an uploaded attachment is shown as a local bubble but
  // never persisted as its own message on the backend (only the synthetic
  // "I shared a document/image..." follow-up text is), so these never come
  // back from conversation history after a reload.
  mediaUrl?: string;
  mediaType?: "image" | "document";
  mediaName?: string;
}

export interface Product {
  _id: string;
  partnerProductId?: string;
  drugId: string;
  name: string;
  sku?: string;
  imageUrl?: string;
  categoryName?: string;
  prescriptionRequired?: boolean;
  manufacturerName?: string;
  price: number;
  stockQuantity: number;
  status?: string;
}

export interface CartItem {
  drugId: string;
  quantity: number;
  price?: number;
  dosage?: string;
  specialInstructions?: string;
  imageUrl?: string;
  drugName?: string;
}

export interface Cart {
  _id?: string;
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
}

export interface DeliveryZoneLga {
  name: string;
  price: number;
}

export interface DeliveryZoneState {
  state: string;
  lgas: DeliveryZoneLga[];
}

export interface OrderItem {
  productId: string;
  name?: string;
  sku?: string;
  qty: number;
  price: number;
  dosage?: string;
  specialInstructions?: string;
}

export interface PharmacyOrder {
  _id: string;
  orderNumber: string;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  deliveryStatus?: "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "failed";
  deliveryMethod?: string;
  shippingAddress?: { name?: string; phone?: string; addressLine?: string; city?: string; state?: string; lga?: string };
  discreetPackaging?: boolean;
  createdAt: string;
}

export interface UserProfile {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  homeAddress?: string;
  city?: string;
  state?: string;
  lga?: string;
  pseudonym?: string;
  userImage?: { imageUrl: string } | string | null;
}
