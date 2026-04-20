export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      condition: {
        Row: {
          created_at: string
          id: string
          label: string
          notes: string | null
          pet_id: string
          resolved_on: string | null
          started_on: string | null
          status: Database["public"]["Enums"]["condition_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          notes?: string | null
          pet_id: string
          resolved_on?: string | null
          started_on?: string | null
          status?: Database["public"]["Enums"]["condition_status"]
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          notes?: string | null
          pet_id?: string
          resolved_on?: string | null
          started_on?: string | null
          status?: Database["public"]["Enums"]["condition_status"]
        }
        Relationships: []
      }
      household: {
        Row: { created_at: string; id: string; name: string; owner_id: string }
        Insert: { created_at?: string; id?: string; name: string; owner_id: string }
        Update: { created_at?: string; id?: string; name?: string; owner_id?: string }
        Relationships: []
      }
      log_entry: {
        Row: {
          author_id: string
          body: string | null
          created_at: string
          deleted_at: string | null
          id: string
          kind: Database["public"]["Enums"]["log_kind"]
          occurred_at: string
          pet_id: string
          severity: number | null
          structured: Json
          tags: string[]
          updated_at: string
        }
        Insert: {
          author_id: string
          body?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          kind: Database["public"]["Enums"]["log_kind"]
          occurred_at?: string
          pet_id: string
          severity?: number | null
          structured?: Json
          tags?: string[]
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["log_kind"]
          occurred_at?: string
          pet_id?: string
          severity?: number | null
          structured?: Json
          tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      household_member: {
        Row: {
          created_at: string
          household_id: string
          id: string
          invited_email: string | null
          role: Database["public"]["Enums"]["member_role"]
          user_id: string | null
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          invited_email?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string | null
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          invited_email?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string | null
        }
        Relationships: []
      }
      media: {
        Row: {
          captured_at: string | null
          created_at: string
          duration_seconds: number | null
          height: number | null
          id: string
          log_entry_id: string
          mime_type: string
          pet_id: string
          size_bytes: number
          storage_path: string
          width: number | null
        }
        Insert: {
          captured_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          height?: number | null
          id?: string
          log_entry_id: string
          mime_type: string
          pet_id: string
          size_bytes: number
          storage_path: string
          width?: number | null
        }
        Update: {
          captured_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          height?: number | null
          id?: string
          log_entry_id?: string
          mime_type?: string
          pet_id?: string
          size_bytes?: number
          storage_path?: string
          width?: number | null
        }
        Relationships: []
      }
      medication: {
        Row: {
          active: boolean
          created_at: string
          dose_amount: string | null
          end_date: string | null
          id: string
          name: string
          notes: string | null
          pet_id: string
          prescribed_by: string | null
          schedule: string | null
          start_date: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          dose_amount?: string | null
          end_date?: string | null
          id?: string
          name: string
          notes?: string | null
          pet_id: string
          prescribed_by?: string | null
          schedule?: string | null
          start_date?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          dose_amount?: string | null
          end_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          pet_id?: string
          prescribed_by?: string | null
          schedule?: string | null
          start_date?: string | null
        }
        Relationships: []
      }
      reminder: {
        Row: {
          id: string
          pet_id: string
          medication_id: string | null
          kind: Database["public"]["Enums"]["reminder_kind"]
          title: string
          due_at: string
          status: Database["public"]["Enums"]["reminder_status"]
          resolved_at: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          pet_id: string
          medication_id?: string | null
          kind: Database["public"]["Enums"]["reminder_kind"]
          title: string
          due_at: string
          status?: Database["public"]["Enums"]["reminder_status"]
          resolved_at?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          pet_id?: string
          medication_id?: string | null
          kind?: Database["public"]["Enums"]["reminder_kind"]
          title?: string
          due_at?: string
          status?: Database["public"]["Enums"]["reminder_status"]
          resolved_at?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      medication_dose: {
        Row: {
          id: string
          medication_id: string
          pet_id: string
          reminder_id: string | null
          given_by: string | null
          outcome: Database["public"]["Enums"]["dose_outcome"]
          occurred_at: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          medication_id: string
          pet_id: string
          reminder_id?: string | null
          given_by?: string | null
          outcome: Database["public"]["Enums"]["dose_outcome"]
          occurred_at?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          medication_id?: string
          pet_id?: string
          reminder_id?: string | null
          given_by?: string | null
          outcome?: Database["public"]["Enums"]["dose_outcome"]
          occurred_at?: string
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      summary: {
        Row: {
          id: string
          pet_id: string
          author_id: string
          kind: Database["public"]["Enums"]["summary_kind"]
          status: Database["public"]["Enums"]["summary_status"]
          range_start: string | null
          range_end: string | null
          issue_focus: string | null
          markdown: string
          model: string
          prompt_version: string
          input_entry_ids: string[]
          usage: Json
          pdf_storage_path: string | null
          created_at: string
        }
        Insert: {
          id?: string
          pet_id: string
          author_id: string
          kind: Database["public"]["Enums"]["summary_kind"]
          status?: Database["public"]["Enums"]["summary_status"]
          range_start?: string | null
          range_end?: string | null
          issue_focus?: string | null
          markdown: string
          model: string
          prompt_version: string
          input_entry_ids?: string[]
          usage?: Json
          pdf_storage_path?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          pet_id?: string
          author_id?: string
          kind?: Database["public"]["Enums"]["summary_kind"]
          status?: Database["public"]["Enums"]["summary_status"]
          range_start?: string | null
          range_end?: string | null
          issue_focus?: string | null
          markdown?: string
          model?: string
          prompt_version?: string
          input_entry_ids?: string[]
          usage?: Json
          pdf_storage_path?: string | null
          created_at?: string
        }
        Relationships: []
      }
      pet: {
        Row: {
          avatar_url: string | null
          breed: string | null
          created_at: string
          date_of_birth: string | null
          deleted_at: string | null
          household_id: string
          id: string
          microchip_id: string | null
          name: string
          neutered: boolean | null
          notes: string | null
          sex: Database["public"]["Enums"]["sex_kind"]
          species: Database["public"]["Enums"]["species_kind"]
          updated_at: string
          vet_contact: string | null
          vet_name: string | null
          weight_kg: number | null
        }
        Insert: {
          avatar_url?: string | null
          breed?: string | null
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          household_id: string
          id?: string
          microchip_id?: string | null
          name: string
          neutered?: boolean | null
          notes?: string | null
          sex?: Database["public"]["Enums"]["sex_kind"]
          species: Database["public"]["Enums"]["species_kind"]
          updated_at?: string
          vet_contact?: string | null
          vet_name?: string | null
          weight_kg?: number | null
        }
        Update: {
          avatar_url?: string | null
          breed?: string | null
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          household_id?: string
          id?: string
          microchip_id?: string | null
          name?: string
          neutered?: boolean | null
          notes?: string | null
          sex?: Database["public"]["Enums"]["sex_kind"]
          species?: Database["public"]["Enums"]["species_kind"]
          updated_at?: string
          vet_contact?: string | null
          vet_name?: string | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: { user_household_ids: { Args: Record<string, never>; Returns: string[] } }
    Enums: {
      condition_status: "active" | "resolved" | "monitoring"
      log_kind:
        | "symptom"
        | "behavior"
        | "meal"
        | "stool"
        | "activity"
        | "incident"
        | "note"
      member_role: "owner" | "caretaker"
      sex_kind: "male" | "female" | "unknown"
      species_kind: "dog" | "cat" | "other"
      subscription_tier: "free" | "pro"
      summary_kind: "vet_visit" | "range" | "issue"
      summary_status: "draft" | "final"
      reminder_kind: "medication" | "vet_followup" | "custom"
      reminder_status: "pending" | "done" | "skipped"
      dose_outcome: "given" | "missed" | "refused"
    }
    CompositeTypes: Record<string, never>
  }
}

export type Pet = Database["public"]["Tables"]["pet"]["Row"]
export type PetInsert = Database["public"]["Tables"]["pet"]["Insert"]
export type Condition = Database["public"]["Tables"]["condition"]["Row"]
export type Medication = Database["public"]["Tables"]["medication"]["Row"]
export type LogEntry = Database["public"]["Tables"]["log_entry"]["Row"]
export type LogEntryInsert = Database["public"]["Tables"]["log_entry"]["Insert"]
export type Media = Database["public"]["Tables"]["media"]["Row"]
export type Summary = Database["public"]["Tables"]["summary"]["Row"]
export type SummaryInsert = Database["public"]["Tables"]["summary"]["Insert"]
export type SummaryKind = Database["public"]["Enums"]["summary_kind"]
export type SummaryStatus = Database["public"]["Enums"]["summary_status"]
export type Reminder = Database["public"]["Tables"]["reminder"]["Row"]
export type ReminderInsert = Database["public"]["Tables"]["reminder"]["Insert"]
export type ReminderKind = Database["public"]["Enums"]["reminder_kind"]
export type ReminderStatus = Database["public"]["Enums"]["reminder_status"]
export type MedicationDose = Database["public"]["Tables"]["medication_dose"]["Row"]
export type DoseOutcome = Database["public"]["Enums"]["dose_outcome"]
export type Species = Database["public"]["Enums"]["species_kind"]
export type Sex = Database["public"]["Enums"]["sex_kind"]
export type ConditionStatus = Database["public"]["Enums"]["condition_status"]
export type LogKind = Database["public"]["Enums"]["log_kind"]

export const LOG_KINDS: LogKind[] = [
  "symptom",
  "behavior",
  "meal",
  "stool",
  "activity",
  "incident",
  "note",
]
