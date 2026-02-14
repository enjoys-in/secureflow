model
  schema 1.1

type user

type system
  relations
    define owner: [user]
    define admin: [user]
    define editor: [user]
    define viewer: [user]
    define can_admin: owner or admin
    define can_edit: can_admin or editor
    define can_view: can_edit or viewer

type firewall
  relations
    define owner: [user]
    define admin: [user]
    define editor: [user]
    define viewer: [user]
    define can_admin: owner or admin
    define can_edit: can_admin or editor
    define can_view: can_edit or viewer

type security_group
  relations
    define owner: [user]
    define editor: [user]
    define viewer: [user]
    define can_edit: owner or editor
    define can_view: can_edit or viewer
