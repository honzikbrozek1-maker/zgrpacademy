CREATE INDEX IF NOT EXISTS idx_questions_level_id_order ON public.questions (level_id, order_index);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON public.user_progress (user_id);
CREATE INDEX IF NOT EXISTS idx_review_items_user_id ON public.review_items (user_id);
CREATE INDEX IF NOT EXISTS idx_issued_diplomas_user_id ON public.issued_diplomas (user_id);