drop table if exists invites;
drop table if exists group_members;
drop table if exists groups;
delete from schema_migrations where name='013_grupos.sql';
