"""Admin platform tables: audit logs, platform settings, user active flag."""
from alembic import op
import sqlalchemy as sa

revision = "a41f9c2d77e1"
down_revision = "e92afd0863cb"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False))
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("actor_id", sa.String(36), index=True, nullable=False),
        sa.Column("actor_name", sa.String(255), nullable=False),
        sa.Column("actor_role", sa.String(32), server_default="", nullable=False),
        sa.Column("action", sa.String(128), index=True, nullable=False),
        sa.Column("entity_type", sa.String(64), server_default="", nullable=False),
        sa.Column("entity_id", sa.String(64), nullable=True),
        sa.Column("meta", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), index=True, nullable=False),
    )
    op.create_table(
        "platform_settings",
        sa.Column("key", sa.String(128), primary_key=True),
        sa.Column("value", sa.JSON(), nullable=True),
        sa.Column("updated_by", sa.String(36), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("platform_settings")
    op.drop_table("audit_logs")
    op.drop_column("users", "is_active")
