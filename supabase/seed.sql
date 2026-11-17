-- Optional sample data.
update public.settings set shop_name = '3年1組 模擬店' where id = 1;
insert into public.menu_items (name, price_tickets, sort_order) values
  ('焼きそば', 3, 0),
  ('フランクフルト', 2, 1),
  ('ジュース', 1, 2);
