export interface User {
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  role: "patient" | "doctor" | "admin";
  active: number;
  profile_details?: string;
}
export interface Slot {
  slot_id: string;
  doctor_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
}
export interface Doctor {
  doctor_id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  specialization: string;
  qualification: string;
  experience_years: number;
  consultation_fee: number;
  biography: string;
  image: number;
  active: number;
  next_available?: Slot | null;
}
export interface Appointment {
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  doctor_name: string;
  specialization: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  profile_details: string;
  slot_id: string;
  appointment_date: string;
  appointment_time: string;
  booking_status: string;
  amount: number;
  payment_status: string;
  transaction_reference: string;
}
export interface Notice {
  notification_id: string;
  message: string;
  notification_status: string;
  created_at: string;
}
export interface Stats {
  counts: Record<string, number>;
  by_doctor: { full_name: string; count: number }[];
  trends: { date: string; count: number }[];
}
export interface WorkbookResult {
  valid: boolean;
  applied: boolean;
  counts: Record<string, number>;
  preview: Record<string, Record<string, unknown>[]>;
  message: string;
}
