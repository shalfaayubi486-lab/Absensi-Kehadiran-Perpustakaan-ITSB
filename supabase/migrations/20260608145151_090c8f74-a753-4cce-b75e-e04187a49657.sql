
CREATE TABLE public.book_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  judul_buku text NOT NULL,
  tanggal_pinjam timestamptz NOT NULL DEFAULT now(),
  tanggal_kembali timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_loans TO anon, authenticated;
GRANT ALL ON public.book_loans TO service_role;

ALTER TABLE public.book_loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read loans" ON public.book_loans FOR SELECT USING (true);
CREATE POLICY "public insert loans" ON public.book_loans FOR INSERT WITH CHECK (true);
CREATE POLICY "public update loans" ON public.book_loans FOR UPDATE USING (true);
CREATE POLICY "public delete loans" ON public.book_loans FOR DELETE USING (true);

CREATE INDEX idx_book_loans_user ON public.book_loans(user_id);
CREATE INDEX idx_book_loans_tanggal ON public.book_loans(tanggal_pinjam DESC);
