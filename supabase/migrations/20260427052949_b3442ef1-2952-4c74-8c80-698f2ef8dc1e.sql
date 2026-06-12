
-- Users table (mahasiswa)
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nama TEXT NOT NULL,
  nim TEXT NOT NULL UNIQUE,
  face_descriptor JSONB NOT NULL,
  foto_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.attendance_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attendance_user ON public.attendance_logs(user_id);
CREATE INDEX idx_attendance_timestamp ON public.attendance_logs(timestamp DESC);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

-- Open access for this learning project (no auth). Adjust later for production.
CREATE POLICY "public read users" ON public.users FOR SELECT USING (true);
CREATE POLICY "public insert users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "public update users" ON public.users FOR UPDATE USING (true);
CREATE POLICY "public delete users" ON public.users FOR DELETE USING (true);

CREATE POLICY "public read logs" ON public.attendance_logs FOR SELECT USING (true);
CREATE POLICY "public insert logs" ON public.attendance_logs FOR INSERT WITH CHECK (true);

-- Storage bucket for face photos
INSERT INTO storage.buckets (id, name, public) VALUES ('faces', 'faces', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public read faces" ON storage.objects FOR SELECT USING (bucket_id = 'faces');
CREATE POLICY "public upload faces" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'faces');
