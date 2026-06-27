-- ============================================================
--  「妆容相册」存储权限 —— 在 Supabase 里运行一次即可
--  路径：supabase.com → 你的项目 (liwanjing200's Project)
--        → 左侧 SQL Editor → New query → 粘贴本文件 → Run
--
--  作用：
--   1) 删掉之前误建的空表 journals（不影响你的 daily_data 数据）
--   2) 让妆容相册能把照片上传/读取到私密桶 makeup-photos
--      —— 仅开放「上传」和「读取」，不开放删除/改写，权限最小
-- ============================================================

drop table if exists public.journals cascade;

drop policy if exists "own_photos_select" on storage.objects;
drop policy if exists "own_photos_insert" on storage.objects;
drop policy if exists "own_photos_update" on storage.objects;
drop policy if exists "own_photos_delete" on storage.objects;

create policy "makeup_read"   on storage.objects
  for select using (bucket_id = 'makeup-photos');
create policy "makeup_upload" on storage.objects
  for insert with check (bucket_id = 'makeup-photos');
