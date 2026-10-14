import { z } from 'zod';

export const LoginSchema = z.object({
  username: z.string().min(1, 'Username wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi'),
});

export const CreateDocumentSchema = z.object({
  vendor: z.string().min(2, 'Nama vendor minimal 2 karakter'),
  wa_vendor: z.string().optional().default(''),
  judul: z.string().min(3, 'Judul/jenis formulir minimal 3 karakter'),
  deadline: z.string().optional().default(''),
  catatan: z.string().optional().default(''),
});

export const UpdateDocumentSchema = z.object({
  vendor: z.string().min(2, 'Nama vendor minimal 2 karakter').optional(),
  wa_vendor: z.string().optional(),
  judul: z.string().min(3, 'Judul formulir minimal 3 karakter').optional(),
  deadline: z.string().optional(),
  catatan: z.string().optional(),
});

export const ChangeStatusSchema = z.object({
  status: z.enum(['On Going', 'Perlu Direvisi', 'Perlu Ditandatangani', 'Selesai'] as const),
  catatan: z.string().min(1, 'Catatan perubahan status wajib diisi'),
});

export const UpdateVersionSchema = z.object({
  catatan: z.string().optional().default(''),
});

export const UpdateSettingsSchema = z.object({
  fonnte_token: z.string().optional(),
  default_wa_number: z.string().optional(),
  recipient_target: z.enum(['self', 'vendor', 'both'] as const).optional(),
  drive_folder_id: z.string().optional(),
  max_file_size_mb: z.number().min(1).max(50).optional(),
  timezone: z.string().optional(),
  deadline_h7_active: z.boolean().optional(),
  deadline_h3_active: z.boolean().optional(),
  deadline_h1_active: z.boolean().optional(),
  deadline_h0_active: z.boolean().optional(),
  deadline_h7_template: z.string().optional(),
  deadline_h3_template: z.string().optional(),
  deadline_h1_template: z.string().optional(),
  deadline_h0_template: z.string().optional(),
});

export const ReminderRuleItemSchema = z.object({
  status: z.enum(['On Going', 'Perlu Direvisi', 'Perlu Ditandatangani'] as const),
  aktif: z.boolean(),
  jam: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format jam harus HH:MM (contoh 09:00)'),
  hari: z.string(), // comma separated "1,2,3,4,5"
  interval_hari: z.number().min(1).max(30),
  template: z.string().min(5, 'Template pesan tidak boleh kosong'),
});

export const UpdateReminderRulesSchema = z.array(ReminderRuleItemSchema);

export const TestSendSchema = z.object({
  phone: z.string().min(8, 'Nomor WhatsApp minimal 8 digit'),
  message: z.string().min(1, 'Pesan tidak boleh kosong'),
});
